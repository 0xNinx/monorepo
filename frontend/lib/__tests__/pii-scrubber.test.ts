import { describe, expect, it } from "vitest";
import {
  redactString,
  isSensitiveField,
  isSensitiveQueryParam,
  redactObject,
  stripSensitiveQueryParams,
  redactUrl,
  redactHeaders,
  scrubEvent,
  scrubBreadcrumb,
} from "../pii-scrubber";

describe("redactString", () => {
  it("redacts email addresses", () => {
    const input = "Contact user@example.com for support";
    const output = redactString(input);
    expect(output).toContain("[REDACTED_EMAIL]");
    expect(output).not.toContain("user@example.com");
  });

  it("redacts multiple email addresses", () => {
    const input = "Email alice@test.com and bob@test.com";
    const output = redactString(input);
    expect(output).not.toContain("alice@test.com");
    expect(output).not.toContain("bob@test.com");
  });

  it("redacts phone numbers in various formats", () => {
    const input = "Call 555-123-4567 or (555) 123-4567";
    const output = redactString(input);
    expect(output).toContain("[REDACTED_PHONE]");
    expect(output).not.toContain("555-123-4567");
  });

  it("redacts UUIDs", () => {
    const input = "Document id: 550e8400-e29b-41d4-a716-446655440000";
    const output = redactString(input);
    expect(output).toContain("[REDACTED_UUID]");
    expect(output).not.toContain("550e8400-e29b-41d4-a716-446655440000");
  });

  it("redacts JWT tokens", () => {
    const input = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
    const output = redactString(input);
    expect(output).toContain("[REDACTED_JWT]");
    expect(output).not.toContain("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
  });

  it("redacts long alphanumeric strings (API keys)", () => {
    const input = "API key: abcdefghijklmnopqrstuvwxyz123456";
    const output = redactString(input);
    expect(output).toContain("[REDACTED_KEY]");
    expect(output).not.toContain("abcdefghijklmnopqrstuvwxyz123456");
  });

  it("redacts document keys", () => {
    const input = "Document doc_abc123def456ghi789";
    const output = redactString(input);
    expect(output).toContain("[REDACTED_DOC_KEY]");
    expect(output).not.toContain("doc_abc123def456ghi789");
  });

  it("preserves non-PII text", () => {
    const input = "Error in component at line 42";
    const output = redactString(input);
    expect(output).toBe(input);
  });
});

describe("isSensitiveField", () => {
  it("identifies sensitive field names", () => {
    expect(isSensitiveField("password")).toBe(true);
    expect(isSensitiveField("api_key")).toBe(true);
    expect(isSensitiveField("accessToken")).toBe(true);
    expect(isSensitiveField("user_email")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isSensitiveField("PASSWORD")).toBe(true);
    expect(isSensitiveField("ApiKey")).toBe(true);
    expect(isSensitiveField("AUTHORIZATION")).toBe(true);
  });

  it("identifies non-sensitive field names", () => {
    expect(isSensitiveField("name")).toBe(false);
    expect(isSensitiveField("id")).toBe(false);
    expect(isSensitiveField("status")).toBe(false);
  });
});

describe("isSensitiveQueryParam", () => {
  it("identifies sensitive query parameters", () => {
    expect(isSensitiveQueryParam("token")).toBe(true);
    expect(isSensitiveQueryParam("api_key")).toBe(true);
    expect(isSensitiveQueryParam("sessionid")).toBe(true);
  });

  it("identifies non-sensitive query parameters", () => {
    expect(isSensitiveQueryParam("page")).toBe(false);
    expect(isSensitiveQueryParam("limit")).toBe(false);
    expect(isSensitiveQueryParam("sort")).toBe(false);
  });
});

describe("redactObject", () => {
  it("redacts sensitive field values", () => {
    const input = {
      name: "John",
      password: "secret123",
      email: "john@example.com",
    };
    const output = redactObject(input);
    expect(output.name).toBe("John");
    expect(output.password).toBe("[REDACTED]");
    // 'email' is now strictly sensitive, so it gets [REDACTED]
    expect(output.email).toBe("[REDACTED]");
  });

  it("redacts nested objects", () => {
    const input = {
      user: {
        name: "Alice",
        email: "alice@example.com",
        credentials: {
          apiKey: "secret-key-123",
        },
      },
    };
    const output = redactObject(input);
    expect(output.user.name).toBe("Alice");
    // 'email' is now strictly sensitive, so it gets [REDACTED]
    expect(output.user.email).toBe("[REDACTED]");
    // 'apiKey' contains 'key' which is strictly sensitive
    expect(output.user.credentials.apiKey).toBe("[REDACTED]");
  });

  it("redacts arrays", () => {
    const input = {
      items: [
        { email: "user1@example.com" },
        { email: "user2@example.com" },
      ],
    };
    const output = redactObject(input);
    // 'email' is now strictly sensitive, so it gets [REDACTED]
    expect(output.items[0].email).toBe("[REDACTED]");
    expect(output.items[1].email).toBe("[REDACTED]");
  });

  it("preserves numbers and booleans", () => {
    const input = {
      count: 42,
      active: true,
      ratio: 3.14,
    };
    const output = redactObject(input);
    expect(output.count).toBe(42);
    expect(output.active).toBe(true);
    expect(output.ratio).toBe(3.14);
  });

  it("handles null and undefined", () => {
    const input = {
      value: null,
      missing: undefined,
    };
    const output = redactObject(input);
    expect(output.value).toBeNull();
    expect(output.missing).toBeUndefined();
  });

  it("prevents infinite recursion with max depth", () => {
    const circular: any = { a: 1 };
    circular.self = circular;
    const output = redactObject(circular);
    expect(output).toBeDefined();
  });
});

describe("stripSensitiveQueryParams", () => {
  it("redacts sensitive query parameters", () => {
    const input = "https://example.com/api?token=secret123&page=1";
    const output = stripSensitiveQueryParams(input);
    // URL encoding applies
    expect(output).toContain("token=%5BREDACTED%5D");
    expect(output).toContain("page=1");
    expect(output).not.toContain("secret123");
  });

  it("redacts multiple sensitive params", () => {
    const input = "https://example.com?token=abc&api_key=xyz&user=john";
    const output = stripSensitiveQueryParams(input);
    // URL encoding applies
    expect(output).toContain("token=%5BREDACTED%5D");
    expect(output).toContain("api_key=%5BREDACTED%5D");
    expect(output).toContain("user=john");
  });

  it("handles URLs without query params", () => {
    const input = "https://example.com/path";
    const output = stripSensitiveQueryParams(input);
    expect(output).toBe(input);
  });

  it("handles malformed URLs gracefully", () => {
    const input = "not-a-url";
    const output = stripSensitiveQueryParams(input);
    expect(output).toBeDefined();
  });
});

describe("redactUrl", () => {
  it("redacts PII in URL path and query", () => {
    const input = "https://example.com/users/user@example.com?token=secret";
    const output = redactUrl(input);
    expect(output).toContain("[REDACTED_EMAIL]");
    // URL encoding applies to query params
    expect(output).toContain("token=%5BREDACTED%5D");
    expect(output).not.toContain("user@example.com");
    expect(output).not.toContain("secret");
  });
});

describe("redactHeaders", () => {
  it("redacts sensitive headers", () => {
    const input = {
      authorization: "Bearer token123",
      "content-type": "application/json",
      cookie: "session=abc",
    };
    const output = redactHeaders(input);
    expect(output.authorization).toBe("[REDACTED]");
    expect(output["content-type"]).toBe("application/json");
    // cookie header value gets pattern-redacted first, then replaced
    expect(output.cookie).toBe("[REDACTED]");
  });

  it("redacts PII in header values", () => {
    const input = {
      "x-user-email": "user@example.com",
    };
    const output = redactHeaders(input);
    // Header name contains 'email' which is strictly sensitive
    expect(output["x-user-email"]).toBe("[REDACTED]");
  });
});

describe("scrubEvent", () => {
  it("scrubs request URL and query string", () => {
    const event = {
      request: {
        url: "https://example.com?token=secret&email=user@example.com",
        query_string: { token: "secret", page: "1" },
      },
    };
    const output = scrubEvent(event);
    // URL is URL-encoded, so check for encoded version
    expect(output.request.url).toContain("%5BREDACTED%5D");
    expect(output.request.url).not.toContain("secret");
    expect(output.request.query_string.token).toBe("[REDACTED]");
    expect(output.request.query_string.page).toBe("1");
  });

  it("scrubs request headers", () => {
    const event = {
      request: {
        headers: {
          authorization: "Bearer token123",
          "user-agent": "Mozilla",
        },
      },
    };
    const output = scrubEvent(event);
    expect(output.request.headers.authorization).toBe("[REDACTED]");
    expect(output.request.headers["user-agent"]).toBe("Mozilla");
  });

  it("deletes cookies from request", () => {
    const event = {
      request: {
        cookies: { session: "abc123" },
      },
    };
    const output = scrubEvent(event);
    expect(output.request.cookies).toBeUndefined();
  });

  it("scrubs user data", () => {
    const event = {
      user: {
        id: "123",
        email: "user@example.com",
        username: "john",
      },
    };
    const output = scrubEvent(event);
    // 'email' is strictly sensitive, so it gets [REDACTED]
    expect(output.user.email).toBe("[REDACTED]");
    expect(output.user.id).toBe("123");
    expect(output.user.username).toBe("john");
  });

  it("scrubs extra data", () => {
    const event = {
      extra: {
        apiKey: "secret",
        component: "Button",
      },
    };
    const output = scrubEvent(event);
    expect(output.extra.apiKey).toBe("[REDACTED]");
    expect(output.extra.component).toBe("Button");
  });

  it("scrubs exception messages", () => {
    const event = {
      exception: {
        values: [
          {
            value: "Error for user@example.com with token abc123",
            type: "ValidationError",
          },
        ],
      },
    };
    const output = scrubEvent(event);
    // Email is redacted, token is too short for key pattern
    expect(output.exception.values[0].value).toContain("[REDACTED_EMAIL]");
    expect(output.exception.values[0].value).not.toContain("user@example.com");
    expect(output.exception.values[0].type).toBe("ValidationError");
  });

  it("scrubs event message", () => {
    const event = {
      message: "Failed to authenticate user@example.com",
    };
    const output = scrubEvent(event);
    expect(output.message).toContain("[REDACTED_EMAIL]");
    expect(output.message).not.toContain("user@example.com");
  });

  it("scrubs breadcrumbs", () => {
    const event = {
      breadcrumbs: [
        {
          message: "Navigated to /users/user@example.com",
          category: "navigation",
        },
      ],
    };
    const output = scrubEvent(event);
    expect(output.breadcrumbs[0].message).toContain("[REDACTED_EMAIL]");
  });

  it("preserves non-PII debugging context", () => {
    const event = {
      message: "Component failed to render",
      tags: {
        component: "UserProfile",
        environment: "production",
      },
      extra: {
        lineNumber: 42,
        errorCode: "ERR_001",
      },
    };
    const output = scrubEvent(event);
    expect(output.message).toBe("Component failed to render");
    expect(output.tags.component).toBe("UserProfile");
    expect(output.tags.environment).toBe("production");
    expect(output.extra.lineNumber).toBe(42);
    expect(output.extra.errorCode).toBe("ERR_001");
  });
});

describe("scrubBreadcrumb", () => {
  it("scrubs breadcrumb message", () => {
    const breadcrumb = {
      message: "API call failed for user@example.com",
      category: "http",
    };
    const output = scrubBreadcrumb(breadcrumb);
    expect(output.message).toContain("[REDACTED_EMAIL]");
    expect(output.category).toBe("http");
  });

  it("scrubs breadcrumb data", () => {
    const breadcrumb = {
      category: "http",
      data: {
        url: "https://api.example.com?token=secret",
        method: "GET",
      },
    };
    const output = scrubBreadcrumb(breadcrumb);
    // URL is URL-encoded
    expect(output.data.url).toContain("%5BREDACTED%5D");
    expect(output.data.method).toBe("GET");
  });

  it("scrubs navigation breadcrumb URLs", () => {
    const breadcrumb = {
      category: "navigation",
      data: {
        from: "/dashboard",
        to: "/profile/user@example.com?token=abc",
      },
    };
    const output = scrubBreadcrumb(breadcrumb);
    expect(output.data.from).toBe("/dashboard");
    // Email is redacted, token param is stripped
    expect(output.data.to).toContain("[REDACTED_EMAIL]");
    expect(output.data.to).not.toContain("user@example.com");
  });

  it("scrubs HTTP breadcrumb headers", () => {
    const breadcrumb = {
      category: "http",
      data: {
        url: "https://api.example.com",
        request_headers: {
          authorization: "Bearer token123",
        },
        response_headers: {
          "x-auth-token": "secret456",
        },
      },
    };
    const output = scrubBreadcrumb(breadcrumb);
    expect(output.data.request_headers.authorization).toBe("[REDACTED]");
    expect(output.data.response_headers["x-auth-token"]).toBe("[REDACTED]");
  });

  it("preserves non-sensitive breadcrumb data", () => {
    const breadcrumb = {
      category: "ui",
      message: "Button clicked",
      data: {
        buttonId: "submit-btn",
        timestamp: 1234567890,
      },
    };
    const output = scrubBreadcrumb(breadcrumb);
    expect(output.message).toBe("Button clicked");
    expect(output.data.buttonId).toBe("submit-btn");
    expect(output.data.timestamp).toBe(1234567890);
  });
});
