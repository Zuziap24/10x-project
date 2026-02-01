/**
 * Przykładowy test jednostkowy - Walidatory
 * Lokalizacja: src/lib/validators/__tests__/example.test.ts
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";

// Przykładowy schemat walidacji (należy zastąpić rzeczywistym schematem z projektu)
const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

describe("LoginSchema Validator", () => {
  it("should validate correct login data", () => {
    const validData = {
      email: "test@example.com",
      password: "password123",
    };

    const result = LoginSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should reject invalid email", () => {
    const invalidData = {
      email: "not-an-email",
      password: "password123",
    };

    const result = LoginSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe("Invalid email address");
    }
  });

  it("should reject short password", () => {
    const invalidData = {
      email: "test@example.com",
      password: "short",
    };

    const result = LoginSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe("Password must be at least 8 characters");
    }
  });

  it("should reject missing fields", () => {
    const invalidData = {
      email: "test@example.com",
    };

    const result = LoginSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});
