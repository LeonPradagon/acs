import { describe, it, expect } from "vitest";
import { z } from "zod";

// Import the schemas directly
import {
  updateUserRoleSchema,
  updateUserSecuritySchema,
  updateSettingSchema,
  testConnectionSchema,
} from "../../src/validation/admin.validation";

describe("Admin Validation Schemas", () => {
  // ===== updateUserRoleSchema =====
  describe("updateUserRoleSchema", () => {
    it("should accept valid roles", () => {
      expect(updateUserRoleSchema.parse({ role: "user" })).toEqual({ role: "user" });
      expect(updateUserRoleSchema.parse({ role: "admin" })).toEqual({ role: "admin" });
      expect(updateUserRoleSchema.parse({ role: "superadmin" })).toEqual({ role: "superadmin" });
    });

    it("should reject invalid roles", () => {
      expect(() => updateUserRoleSchema.parse({ role: "root" })).toThrow();
      expect(() => updateUserRoleSchema.parse({ role: "" })).toThrow();
      expect(() => updateUserRoleSchema.parse({})).toThrow();
    });
  });

  // ===== updateUserSecuritySchema =====
  describe("updateUserSecuritySchema", () => {
    it("should accept valid security settings", () => {
      const result = updateUserSecuritySchema.parse({
        clearanceLevel: 3,
        divisionId: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.clearanceLevel).toBe(3);
    });

    it("should reject clearance out of range", () => {
      expect(() => updateUserSecuritySchema.parse({ clearanceLevel: 0 })).toThrow();
      expect(() => updateUserSecuritySchema.parse({ clearanceLevel: 6 })).toThrow();
    });

    it("should accept null divisionId", () => {
      const result = updateUserSecuritySchema.parse({
        clearanceLevel: 1,
        divisionId: null,
      });
      expect(result.divisionId).toBeNull();
    });
  });

  // ===== updateSettingSchema =====
  describe("updateSettingSchema", () => {
    it("should accept valid settings", () => {
      const result = updateSettingSchema.parse({
        key: "ERP_CONNECTION_MODE",
        value: "API",
      });
      expect(result.key).toBe("ERP_CONNECTION_MODE");
    });

    it("should reject non-UPPER_SNAKE_CASE keys", () => {
      expect(() =>
        updateSettingSchema.parse({ key: "camelCase", value: "test" })
      ).toThrow();
    });

    it("should reject empty key", () => {
      expect(() =>
        updateSettingSchema.parse({ key: "", value: "test" })
      ).toThrow();
    });
  });

  // ===== testConnectionSchema =====
  describe("testConnectionSchema", () => {
    it("should accept valid DB connection", () => {
      const result = testConnectionSchema.parse({
        mode: "DB",
        url: "https://db.example.com:5432/erp",
      });
      expect(result.mode).toBe("DB");
    });

    it("should accept valid API connection with key", () => {
      const result = testConnectionSchema.parse({
        mode: "API",
        url: "https://api.example.com/v1",
        apiKey: "sk-test-key-123",
      });
      expect(result.apiKey).toBe("sk-test-key-123");
    });

    it("should reject invalid mode", () => {
      expect(() =>
        testConnectionSchema.parse({ mode: "INVALID", url: "https://test.com" })
      ).toThrow();
    });

    it("should reject invalid URL", () => {
      expect(() =>
        testConnectionSchema.parse({ mode: "DB", url: "not-a-url" })
      ).toThrow();
    });
  });
});
