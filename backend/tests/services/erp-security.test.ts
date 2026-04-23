import { describe, it, expect } from "vitest";

/**
 * Unit tests for ERP Service validation logic.
 * Tests the query validation without actual DB connections.
 */
describe("ERP Service — SQL Validation", () => {
  // Simulated validation function (mirrors ErpService.validateReadOnlyQuery)
  function validateReadOnlyQuery(query: string): void {
    const upperQuery = query.toUpperCase();
    const disallowedVerbs = [
      "INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "TRUNCATE",
      "CREATE", "GRANT", "REVOKE", "COMMIT", "ROLLBACK",
      "COPY", "EXECUTE", "CALL", "SET", "DO", "NOTIFY", "LISTEN",
    ];

    for (const verb of disallowedVerbs) {
      const verbRegex = new RegExp(`\\b${verb}\\b`, "i");
      if (verbRegex.test(upperQuery)) {
        throw new Error(`Execution blocked: Query contains disallowed keyword: ${verb}`);
      }
    }

    if (!upperQuery.trim().startsWith("SELECT")) {
      throw new Error("Execution blocked: Query must start with SELECT.");
    }

    if (query.includes(";")) {
      throw new Error("Execution blocked: Multi-statement queries are not allowed.");
    }
  }

  // ===== Valid Queries =====
  it("should allow simple SELECT queries", () => {
    expect(() => validateReadOnlyQuery('SELECT * FROM "ErpEmployee"')).not.toThrow();
  });

  it("should allow SELECT with JOIN", () => {
    expect(() =>
      validateReadOnlyQuery(
        'SELECT e."firstName", s."baseSalary" FROM "ErpEmployee" e JOIN "ErpSalary" s ON e."id" = s."employeeId"'
      )
    ).not.toThrow();
  });

  it("should allow SELECT with WHERE", () => {
    expect(() =>
      validateReadOnlyQuery('SELECT * FROM "ErpEmployee" WHERE "status" = \'ACTIVE\'')
    ).not.toThrow();
  });

  it("should allow SELECT with aggregates", () => {
    expect(() =>
      validateReadOnlyQuery('SELECT COUNT(*), AVG("baseSalary") FROM "ErpSalary"')
    ).not.toThrow();
  });

  // ===== Blocked Queries =====
  it("should block INSERT statements", () => {
    expect(() =>
      validateReadOnlyQuery('INSERT INTO "ErpEmployee" VALUES (\'test\')')
    ).toThrow("INSERT");
  });

  it("should block UPDATE statements", () => {
    expect(() =>
      validateReadOnlyQuery('UPDATE "ErpEmployee" SET "status" = \'INACTIVE\'')
    ).toThrow("UPDATE");
  });

  it("should block DELETE statements", () => {
    expect(() =>
      validateReadOnlyQuery('DELETE FROM "ErpEmployee"')
    ).toThrow("DELETE");
  });

  it("should block DROP TABLE", () => {
    expect(() =>
      validateReadOnlyQuery('DROP TABLE "ErpEmployee"')
    ).toThrow("DROP");
  });

  it("should block TRUNCATE", () => {
    expect(() =>
      validateReadOnlyQuery('TRUNCATE "ErpEmployee"')
    ).toThrow("TRUNCATE");
  });

  // ===== SQL Injection Attempts =====
  it("should block multi-statement injection via semicolon", () => {
    // The DROP keyword is caught first, before the semicolon check
    expect(() =>
      validateReadOnlyQuery('SELECT * FROM "ErpEmployee"; DROP TABLE "ErpEmployee"')
    ).toThrow();
    
    // Pure semicolon injection (no disallowed keywords)
    expect(() =>
      validateReadOnlyQuery('SELECT 1; SELECT 2')
    ).toThrow("Multi-statement");
  });

  it("should block subquery injection with DELETE", () => {
    expect(() =>
      validateReadOnlyQuery('SELECT * FROM "ErpEmployee" WHERE 1=1; DELETE FROM "ErpEmployee"')
    ).toThrow(); // Will catch either semicolon or DELETE
  });

  it("should block GRANT privilege escalation", () => {
    expect(() =>
      validateReadOnlyQuery('GRANT ALL PRIVILEGES ON ALL TABLES TO public')
    ).toThrow("GRANT");
  });

  it("should block COPY (data exfiltration)", () => {
    expect(() =>
      validateReadOnlyQuery("COPY \"ErpEmployee\" TO '/tmp/dump.csv'")
    ).toThrow("COPY");
  });

  // ===== Edge Cases =====
  it("should block non-SELECT queries even if they don't contain disallowed verbs", () => {
    expect(() => validateReadOnlyQuery("EXPLAIN SELECT * FROM users")).toThrow();
  });

  it("should handle case-insensitive keywords", () => {
    expect(() =>
      validateReadOnlyQuery('insert INTO "ErpEmployee" VALUES (1)')
    ).toThrow("INSERT");
  });
});

describe("ERP Service — SSRF Protection", () => {
  // Simulated URL validation (mirrors isUrlSafe in admin.controller)
  function isUrlSafe(urlString: string): boolean {
    try {
      const parsed = new URL(urlString);
      const hostname = parsed.hostname.toLowerCase();
      const blockedPatterns = [
        /^localhost$/,
        /^127\./,
        /^10\./,
        /^172\.(1[6-9]|2[0-9]|3[01])\./,
        /^192\.168\./,
        /^169\.254\./,
        /^0\.0\.0\.0$/,
        /^::1$/,
        /^fc00:/,
        /^fe80:/,
      ];
      if (blockedPatterns.some((p) => p.test(hostname))) return false;
      if (!["http:", "https:", "postgresql:", "postgres:"].includes(parsed.protocol)) return false;
      return true;
    } catch {
      return false;
    }
  }

  it("should allow external URLs", () => {
    expect(isUrlSafe("https://api.example.com/v1")).toBe(true);
    expect(isUrlSafe("postgresql://user:pass@db.example.com:5432/erp")).toBe(true);
  });

  it("should block localhost", () => {
    expect(isUrlSafe("http://localhost:3000")).toBe(false);
    expect(isUrlSafe("http://127.0.0.1:8080")).toBe(false);
  });

  it("should block private networks", () => {
    expect(isUrlSafe("http://10.0.0.1:3000")).toBe(false);
    expect(isUrlSafe("http://192.168.1.1")).toBe(false);
    expect(isUrlSafe("http://172.16.0.1")).toBe(false);
  });

  it("should block cloud metadata endpoint", () => {
    expect(isUrlSafe("http://169.254.169.254/latest/meta-data")).toBe(false);
  });

  it("should reject invalid URLs", () => {
    expect(isUrlSafe("not-a-url")).toBe(false);
    expect(isUrlSafe("")).toBe(false);
  });

  it("should reject dangerous protocols", () => {
    expect(isUrlSafe("file:///etc/passwd")).toBe(false);
    expect(isUrlSafe("ftp://internal.server/data")).toBe(false);
  });
});
