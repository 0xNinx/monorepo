import { describe, it, expect } from "vitest";
import { sanitizeText, escapeHtml, sanitizeUrl, sanitizeHtml } from "./sanitize";

describe("sanitizeText (user-generated content)", () => {
  it("strips script tags from a review string so it renders inert", () => {
    const malicious = 'Nice flat<script>alert("xss")</script>';
    const safe = sanitizeText(malicious);
    expect(safe).not.toContain("<script");
    expect(safe).not.toContain("</script>");
    expect(safe).toContain("Nice flat");
  });

  it("strips inline event handlers and js: protocol from review text", () => {
    const malicious = '<img src=x onerror="steal()"> javascript:doEvil()';
    const safe = sanitizeText(malicious);
    expect(safe).not.toMatch(/onerror\s*=/i);
    expect(safe).not.toContain("<img");
    expect(safe.toLowerCase()).not.toContain("javascript:");
  });

  it("leaves ordinary review prose untouched (apart from trimming)", () => {
    const text = "Great location and very secure. Solid 4 stars.";
    expect(sanitizeText(text)).toBe(text);
  });

  it("removes data: URIs that could carry encoded payloads", () => {
    const safe = sanitizeText("data:text/html;base64,PHNjcmlwdD4=");
    expect(safe.toLowerCase()).not.toContain("data:");
  });
});

describe("escapeHtml", () => {
  it("encodes HTML-significant characters", () => {
    expect(escapeHtml('<b>"hi"</b> & \'bye\'')).toBe(
      "&lt;b&gt;&quot;hi&quot;&lt;/b&gt; &amp; &#x27;bye&#x27;",
    );
  });
});

describe("sanitizeUrl", () => {
  it("allows http/https and rejects javascript: URLs", () => {
    expect(sanitizeUrl("https://example.com/")).toBe("https://example.com/");
    expect(sanitizeUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeUrl("not a url")).toBeNull();
  });
});

describe("sanitizeHtml", () => {
  it("removes script tags and inline handlers from HTML", () => {
    const dirty = '<p onclick="x()">hi</p><script>evil()</script>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain("<script");
    expect(clean).not.toMatch(/onclick\s*=/i);
    expect(clean).toContain("hi");
  });
});
