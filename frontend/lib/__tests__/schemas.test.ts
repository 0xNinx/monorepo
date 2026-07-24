import { describe, expect, it } from "vitest";
import { loginSchema, signupSchema } from "../schemas";

describe("schemas - loginSchema", () => {
  const validCases = [
    { email: "user@example.com" },
    { email: "test.user@domain.co.uk" },
    { email: "user+tag@example.org" },
  ];

  const invalidCases = [
    { email: "", expectedError: "Please enter a valid email address" },
    { email: "not-an-email", expectedError: "Please enter a valid email address" },
    { email: "@example.com", expectedError: "Please enter a valid email address" },
    { email: "user@", expectedError: "Please enter a valid email address" },
  ];

  it("accepts valid login data", () => {
    validCases.forEach((data) => {
      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  it("rejects invalid login data with appropriate errors", () => {
    invalidCases.forEach(({ email, expectedError }) => {
      const result = loginSchema.safeParse({ email });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe(expectedError);
      }
    });
  });
});

describe("schemas - signupSchema", () => {
  const validCases = [
    {
      fullName: "John Doe",
      email: "user@example.com",
      phone: "1234567890",
      password: "password123",
      terms: true,
    },
    {
      fullName: "Jane Smith",
      email: "test@domain.org",
      phone: "9876543210",
      password: "SecurePass1",
      terms: true,
    },
    {
      fullName: "AB", // Boundary: exactly 2 chars
      email: "user+tag@example.com",
      phone: "1234567890", // Boundary: exactly 10 chars
      password: "Pass1234", // Boundary: exactly 8 chars with number
      terms: true,
    },
  ];

  const invalidCases = [
    {
      fullName: "J",
      email: "user@example.com",
      phone: "1234567890",
      password: "password123",
      terms: true,
      expectedError: "Full name must be at least 2 characters",
    },
    {
      fullName: "",
      email: "user@example.com",
      phone: "1234567890",
      password: "password123",
      terms: true,
      expectedError: "Full name must be at least 2 characters",
    },
    {
      fullName: "John Doe",
      email: "invalid-email",
      phone: "1234567890",
      password: "password123",
      terms: true,
      expectedError: "Please enter a valid email address",
    },
    {
      fullName: "John Doe",
      email: "",
      phone: "1234567890",
      password: "password123",
      terms: true,
      expectedError: "Please enter a valid email address",
    },
    {
      fullName: "John Doe",
      email: "user@example.com",
      phone: "123456789",
      password: "password123",
      terms: true,
      expectedError: "Phone number must be at least 10 digits",
    },
    {
      fullName: "John Doe",
      email: "user@example.com",
      phone: "",
      password: "password123",
      terms: true,
      expectedError: "Phone number must be at least 10 digits",
    },
    {
      fullName: "John Doe",
      email: "user@example.com",
      phone: "1234567890",
      password: "short",
      terms: true,
      expectedError: "Password must be at least 8 characters",
    },
    {
      fullName: "John Doe",
      email: "user@example.com",
      phone: "1234567890",
      password: "password",
      terms: true,
      expectedError: "Password must contain at least one number",
    },
    {
      fullName: "John Doe",
      email: "user@example.com",
      phone: "1234567890",
      password: "password123",
      terms: false,
      expectedError: "You must agree to the Terms and Privacy Policy",
    },
  ];

  it("accepts valid signup data", () => {
    validCases.forEach((data) => {
      const result = signupSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  it("rejects invalid signup data with appropriate errors", () => {
    invalidCases.forEach(({ fullName, email, phone, password, terms, expectedError }) => {
      const result = signupSchema.safeParse({ fullName, email, phone, password, terms });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe(expectedError);
      }
    });
  });

  it("handles fullName boundary value (2 characters)", () => {
    const result = signupSchema.safeParse({
      fullName: "AB",
      email: "user@example.com",
      phone: "1234567890",
      password: "password123",
      terms: true,
    });
    expect(result.success).toBe(true);
  });

  it("handles phone boundary value (10 characters)", () => {
    const result = signupSchema.safeParse({
      fullName: "John Doe",
      email: "user@example.com",
      phone: "1234567890",
      password: "password123",
      terms: true,
    });
    expect(result.success).toBe(true);
  });

  it("handles password boundary value (8 characters with number)", () => {
    const result = signupSchema.safeParse({
      fullName: "John Doe",
      email: "user@example.com",
      phone: "1234567890",
      password: "Pass1234",
      terms: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects password without number", () => {
    const result = signupSchema.safeParse({
      fullName: "John Doe",
      email: "user@example.com",
      phone: "1234567890",
      password: "password",
      terms: true,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe("Password must contain at least one number");
    }
  });

  it("rejects terms not agreed", () => {
    const result = signupSchema.safeParse({
      fullName: "John Doe",
      email: "user@example.com",
      phone: "1234567890",
      password: "password123",
      terms: false,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe("You must agree to the Terms and Privacy Policy");
    }
  });

  it("validates cross-field dependencies (all fields required when terms is true)", () => {
    const missingFields = [
      { fullName: "", email: "user@example.com", phone: "1234567890", password: "password123", terms: true },
      { fullName: "John Doe", email: "", phone: "1234567890", password: "password123", terms: true },
      { fullName: "John Doe", email: "user@example.com", phone: "", password: "password123", terms: true },
      { fullName: "John Doe", email: "user@example.com", phone: "1234567890", password: "", terms: true },
    ];

    missingFields.forEach((data) => {
      const result = signupSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});
