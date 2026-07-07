import { describe, it, expect } from "vitest";
import { ErpService } from "../services/erp.service";

// Access private method for testing
const validateQuery = (query: string) => {
  return (ErpService as any).validateReadOnlyQuery(query);
};

describe("ErpService - SQL Security Guardrails", () => {
  describe("Valid Queries (Should Pass)", () => {
    it("should allow a simple SELECT query and append LIMIT 500", () => {
      const q = "SELECT * FROM ErpEmployee";
      const res = validateQuery(q);
      expect(res).toBe("SELECT * FROM ErpEmployee LIMIT 500");
    });

    it("should allow a SELECT query with an existing LIMIT", () => {
      const q = "SELECT * FROM ErpEmployee LIMIT 10";
      const res = validateQuery(q);
      expect(res).toBe("SELECT * FROM ErpEmployee LIMIT 10");
    });

    it("should allow complex SELECT with JOIN and WHERE", () => {
      const q = "SELECT e.firstName, s.baseSalary FROM ErpEmployee e JOIN ErpSalary s ON e.id = s.employeeId WHERE e.status = 'ACTIVE'";
      const res = validateQuery(q);
      expect(res).toContain("LIMIT 500");
      expect(res.startsWith("SELECT")).toBe(true);
    });

    it("should allow CTEs (WITH) that only contain SELECTs", () => {
      const q = "WITH active_emps AS (SELECT id FROM ErpEmployee WHERE status = 'ACTIVE') SELECT * FROM active_emps";
      const res = validateQuery(q);
      expect(res).toContain("LIMIT 500");
    });
  });

  describe("Invalid Queries - Basic Mutations (Should Fail)", () => {
    it("should block INSERT", () => {
      expect(() => validateQuery("INSERT INTO ErpEmployee (id) VALUES (1)")).toThrow(/Execution blocked/i);
    });

    it("should block UPDATE", () => {
      expect(() => validateQuery("UPDATE ErpEmployee SET status = 'INACTIVE'")).toThrow(/Execution blocked/i);
    });

    it("should block DELETE", () => {
      expect(() => validateQuery("DELETE FROM ErpEmployee")).toThrow(/Execution blocked/i);
    });

    it("should block DROP", () => {
      expect(() => validateQuery("DROP TABLE ErpEmployee")).toThrow(/Execution blocked/i);
    });
  });

  describe("Invalid Queries - Advanced Injections (Should Fail)", () => {
    it("should block multi-statement queries using semicolons", () => {
      expect(() => validateQuery("SELECT * FROM ErpEmployee; DROP TABLE ErpEmployee;")).toThrow(/Execution blocked/i);
    });

    it("should block CTEs containing data-modifying statements (INSERT RETURNING)", () => {
      const q = "WITH inserted AS (INSERT INTO ErpEmployee (id) VALUES (1) RETURNING *) SELECT * FROM inserted";
      expect(() => validateQuery(q)).toThrow(/Execution blocked/i);
    });

    it("should block non-select top level statements (e.g., SET)", () => {
      expect(() => validateQuery("SET statement_timeout = 0")).toThrow(/Execution blocked/i);
    });
    
    it("should block GRANT", () => {
      expect(() => validateQuery("GRANT ALL ON ErpEmployee TO public")).toThrow(/Execution blocked/i);
    });
  });
});
