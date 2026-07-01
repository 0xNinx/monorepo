import { describe, expect, it } from "vitest";
import {
  emailSchema,
  amountSchema,
  loginSchema,
  otpSchema,
  signupSchema,
  stakeSchema,
  depositSchema,
  whistleblowerSchema,
  contactSchema,
} from "../formSchemas";

describe("formSchemas - emailSchema", () => {
  const validEmails = [
    "user@example.com",
    "test.user@domain.co.uk",
    "user+tag@example.org",
    "first.last@sub.domain.com",
  ];

  const invalidEmails = [
    { value: "", expectedError: "Email is required" },
    { value: "not-an-email", expectedError: "Enter a valid email address" },
    { value: "@example.com", expectedError: "Enter a valid email address" },
    { value: "user@", expectedError: "Enter a valid email address" },
    { value: "user@.com", expectedError: "Enter a valid email address" },
  ];

  it("accepts valid email addresses", () => {
    validEmails.forEach((email) => {
      const result = emailSchema.safeParse(email);
      expect(result.success).toBe(true);
    });
  });

  it("rejects invalid email addresses with appropriate errors", () => {
    invalidEmails.forEach(({ value, expectedError }) => {
      const result = emailSchema.safeParse(value);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe(expectedError);
      }
    });
  });
});

describe("formSchemas - amountSchema", () => {
  const validAmounts = ["1", "0.01", "1000", "999999.99", "1.5"];

  const invalidAmounts = [
    { value: "", expectedError: "Amount is required" },
    { value: "0", expectedError: "Amount must be a positive number" },
    { value: "-1", expectedError: "Amount must be a positive number" },
    { value: "-100.50", expectedError: "Amount must be a positive number" },
    { value: "abc", expectedError: "Amount must be a positive number" },
    { value: "12.34.56", expectedError: "Amount must be a positive number" },
  ];

  it("accepts valid positive amounts", () => {
    validAmounts.forEach((amount) => {
      const result = amountSchema.safeParse(amount);
      expect(result.success).toBe(true);
    });
  });

  it("rejects invalid amounts with appropriate errors", () => {
    invalidAmounts.forEach(({ value, expectedError }) => {
      const result = amountSchema.safeParse(value);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe(expectedError);
      }
    });
  });

  it("handles boundary values correctly", () => {
    const result = amountSchema.safeParse("0.01");
    expect(result.success).toBe(true);
  });
});

describe("formSchemas - loginSchema", () => {
  const validCases = [
    { email: "user@example.com" },
    { email: "test@domain.org" },
  ];

  const invalidCases = [
    { email: "", expectedError: "Email is required" },
    { email: "invalid-email", expectedError: "Enter a valid email address" },
  ];

  it("accepts valid login data", () => {
    validCases.forEach((data) => {
      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  it("rejects invalid login data", () => {
    invalidCases.forEach(({ email, expectedError }) => {
      const result = loginSchema.safeParse({ email });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe(expectedError);
      }
    });
  });
});

describe("formSchemas - otpSchema", () => {
  const validOtps = ["123456", "000000", "999999"];

  const invalidOtps = [
    { value: "12345", expectedError: "OTP must be exactly 6 digits" },
    { value: "1234567", expectedError: "OTP must be exactly 6 digits" },
    { value: "abcdef", expectedError: "OTP must contain only digits" },
    { value: "12a456", expectedError: "OTP must contain only digits" },
    { value: "", expectedError: "OTP must be exactly 6 digits" },
  ];

  it("accepts valid 6-digit OTPs", () => {
    validOtps.forEach((otp) => {
      const result = otpSchema.safeParse({ otp });
      expect(result.success).toBe(true);
    });
  });

  it("rejects invalid OTPs with appropriate errors", () => {
    invalidOtps.forEach(({ value, expectedError }) => {
      const result = otpSchema.safeParse({ otp: value });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe(expectedError);
      }
    });
  });
});

describe("formSchemas - signupSchema", () => {
  const validCases = [
    { email: "user@example.com", name: "John Doe" },
    { email: "test@domain.org", name: "Jane Smith" },
    { email: "user+tag@example.com", name: "A" }, // Single char name is valid if >= 2 chars... wait, min is 2
  ];

  const invalidCases = [
    { email: "", name: "John Doe", expectedError: "Email is required" },
    { email: "invalid-email", name: "John Doe", expectedError: "Enter a valid email address" },
    { email: "user@example.com", name: "J", expectedError: "Name must be at least 2 characters" },
    { email: "user@example.com", name: "", expectedError: "Name must be at least 2 characters" },
  ];

  it("accepts valid signup data", () => {
    const validData = [
      { email: "user@example.com", name: "John Doe" },
      { email: "test@domain.org", name: "Jane Smith" },
      { email: "user+tag@example.com", name: "AB" },
    ];
    validData.forEach((data) => {
      const result = signupSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  it("rejects invalid signup data", () => {
    invalidCases.forEach(({ email, name, expectedError }) => {
      const result = signupSchema.safeParse({ email, name });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe(expectedError);
      }
    });
  });

  it("handles name boundary value (2 characters)", () => {
    const result = signupSchema.safeParse({ email: "user@example.com", name: "AB" });
    expect(result.success).toBe(true);
  });
});

describe("formSchemas - stakeSchema", () => {
  const validCases = [
    { amount: "100", currency: "USDC", duration: 1 },
    { amount: "1000", currency: "NGN", duration: 30 },
    { amount: "0.01", currency: "USDC", duration: 365 },
  ];

  const invalidCases = [
    { amount: "", currency: "USDC", duration: 10, expectedError: "Amount is required" },
    { amount: "100", currency: "BTC", duration: 10, expectedError: "Invalid enum value. Expected 'USDC' | 'NGN', received 'BTC'" },
    { amount: "100", currency: "USDC", duration: 0, expectedError: "Duration must be at least 1 day" },
    { amount: "-1", currency: "USDC", duration: 10, expectedError: "Amount must be a positive number" },
  ];

  it("accepts valid stake data", () => {
    validCases.forEach((data) => {
      const result = stakeSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  it("rejects invalid stake data", () => {
    invalidCases.forEach(({ amount, currency, duration, expectedError }) => {
      const result = stakeSchema.safeParse({ amount, currency, duration });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe(expectedError);
      }
    });
  });

  it("handles duration boundary value (1 day)", () => {
    const result = stakeSchema.safeParse({ amount: "100", currency: "USDC", duration: 1 });
    expect(result.success).toBe(true);
  });
});

describe("formSchemas - depositSchema", () => {
  const validCases = [
    { amount: "100" },
    { amount: "1000", reference: "REF123" },
    { amount: "500.50", reference: "" },
  ];

  const invalidCases = [
    { amount: "", expectedError: "Amount is required" },
    { amount: "0", expectedError: "Amount must be a positive number" },
    { amount: "-100", expectedError: "Amount must be a positive number" },
  ];

  it("accepts valid deposit data", () => {
    validCases.forEach((data) => {
      const result = depositSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  it("rejects invalid deposit data", () => {
    invalidCases.forEach(({ amount, expectedError }) => {
      const result = depositSchema.safeParse({ amount });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe(expectedError);
      }
    });
  });

  it("accepts deposit without optional reference", () => {
    const result = depositSchema.safeParse({ amount: "100" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reference).toBeUndefined();
    }
  });
});

describe("formSchemas - whistleblowerSchema", () => {
  const validCases = [
    { subject: "Security Issue", description: "This is a detailed description of the issue that needs to be reported." },
    { subject: "Fraud Report", description: "A".repeat(20) },
    {
      subject: "Data Breach",
      description: "Detailed report with attachments",
      attachments: [{ name: "evidence.pdf", url: "https://example.com/evidence.pdf" }],
    },
  ];

  const invalidCases = [
    { subject: "Hi", description: "A".repeat(20), expectedError: "Subject must be at least 5 characters" },
    { subject: "Valid Subject", description: "Short", expectedError: "Please provide more detail (min 20 chars)" },
    { subject: "", description: "A".repeat(20), expectedError: "Subject must be at least 5 characters" },
  ];

  it("accepts valid whistleblower reports", () => {
    validCases.forEach((data) => {
      const result = whistleblowerSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  it("rejects invalid whistleblower reports", () => {
    invalidCases.forEach(({ subject, description, expectedError }) => {
      const result = whistleblowerSchema.safeParse({ subject, description });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe(expectedError);
      }
    });
  });

  it("handles boundary values correctly", () => {
    const result = whistleblowerSchema.safeParse({
      subject: "ABCDE", // Exactly 5 chars
      description: "A".repeat(20), // Exactly 20 chars
    });
    expect(result.success).toBe(true);
  });

  it("validates attachment URLs", () => {
    const result = whistleblowerSchema.safeParse({
      subject: "Valid Subject",
      description: "A".repeat(20),
      attachments: [{ name: "file.pdf", url: "not-a-url" }],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain("url");
    }
  });
});

describe("formSchemas - contactSchema", () => {
  const validCases = [
    { name: "John Doe", email: "user@example.com", message: "Hello, I have a question." },
    { name: "Jane Smith", email: "test@domain.org", message: "A".repeat(10) },
  ];

  const invalidCases = [
    { name: "J", email: "user@example.com", message: "A".repeat(10), expectedError: "Name is required" },
    { name: "John Doe", email: "invalid", message: "A".repeat(10), expectedError: "Enter a valid email address" },
    { name: "John Doe", email: "user@example.com", message: "Short", expectedError: "Message must be at least 10 characters" },
    { name: "", email: "user@example.com", message: "A".repeat(10), expectedError: "Name is required" },
  ];

  it("accepts valid contact form data", () => {
    validCases.forEach((data) => {
      const result = contactSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  it("rejects invalid contact form data", () => {
    invalidCases.forEach(({ name, email, message, expectedError }) => {
      const result = contactSchema.safeParse({ name, email, message });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe(expectedError);
      }
    });
  });

  it("handles boundary values correctly", () => {
    const result = contactSchema.safeParse({
      name: "AB", // Exactly 2 chars
      email: "user@example.com",
      message: "A".repeat(10), // Exactly 10 chars
    });
    expect(result.success).toBe(true);
  });
});
