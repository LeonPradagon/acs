import { prisma } from "../config/db";
import { Pool } from "pg";
import axios from "axios";

/**
 * Service to handle Mock ERP data access via AI Text-to-SQL logic.
 * 
 * Security: All SQL execution is wrapped in READ ONLY transactions.
 * External DB connections use a cached pool to avoid connection leaks.
 */
export class ErpService {
  // Cached external ERP pool — singleton to avoid creating new pool per query
  private static _externalPool: Pool | null = null;
  private static _externalPoolUrl: string | null = null;

  /**
   * Get or create a cached PG Pool for external ERP connections.
   * Pool is re-created if the connection URL changes (admin updated settings).
   */
  private static getExternalPool(connectionString: string): Pool {
    if (this._externalPool && this._externalPoolUrl === connectionString) {
      return this._externalPool;
    }

    // Close old pool if URL changed
    if (this._externalPool) {
      this._externalPool.end().catch(() => {});
    }

    this._externalPool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 5,              // Max 5 connections in pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    this._externalPoolUrl = connectionString;

    return this._externalPool;
  }

  /**
   * Returns the database schema description of the ERP to be injected into the LLM prompt.
   */
  static getErpSchemaInfo(): string {
    return `
    Database ERP Schema (Read-Only PostgreSQL/Mock):

    Table: ErpEmployee
    Columns:
      - id (String, UUID, Primary Key)
      - firstName (String)
      - lastName (String)
      - divisionName (String) - e.g., 'HRD', 'IT', 'FINANCE'
      - jobTitle (String)
      - hireDate (DateTime)
      - status (String: 'ACTIVE', 'INACTIVE')

    Table: ErpSalary
    Columns:
      - id (String, UUID, Primary Key)
      - employeeId (String, Foreign Key to ErpEmployee.id)
      - baseSalary (Float)
      - allowance (Float)
      - currency (String)
      - effectiveDate (DateTime)

    Rules for Querying:
      - You MUST strictly write PostgreSQL compliant SELECT queries.
      - NEVER use INSERT, UPDATE, DELETE, DROP, or ALTER. The connection is hard-blocked from these operations.
      - Return the fields asked by the user intelligently.
      - If you use JOIN, specify table aliases clearly.
    `.trim();
  }

  /**
   * Validate that a query is safe to execute (SELECT-only, no mutation keywords).
   * Throws an error if the query is unsafe.
   */
  private static validateReadOnlyQuery(query: string): void {
    const upperQuery = query.toUpperCase();
    const disallowedVerbs = [
      "INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "TRUNCATE",
      "CREATE", "GRANT", "REVOKE", "COMMIT", "ROLLBACK",
      "COPY", "EXECUTE", "CALL", "SET", "DO", "NOTIFY", "LISTEN",
    ];
    
    for (const verb of disallowedVerbs) {
      const verbRegex = new RegExp(`\\b${verb}\\b`, "i");
      if (verbRegex.test(upperQuery)) {
        throw new Error(`Execution blocked: Query contains disallowed keyword: ${verb}. Only SELECT operations are allowed.`);
      }
    }

    if (!upperQuery.trim().startsWith("SELECT")) {
      throw new Error(`Execution blocked: Query must start with SELECT.`);
    }

    // Block semicolons to prevent multi-statement injection
    if (query.includes(";")) {
      throw new Error("Execution blocked: Multi-statement queries are not allowed.");
    }
  }

  /**
   * Safe executor for LLM-generated SQL against the Mock ERP tables.
   * Wraps execution in a READ ONLY transaction for defense-in-depth.
   */
  static async executeReadOnlySQL(query: string, userDivisionId?: string | null): Promise<any[]> {
    // 1. Application-level validation
    this.validateReadOnlyQuery(query);

    console.log(`[ERP Service] Executing LLM-generated SQL: ${query}`);
    
    try {
      // Fetch dynamic DB URL from settings
      const setting = await prisma.systemSetting.findUnique({ where: { key: "ERP_DB_URL" } });
      if (setting && setting.value) {
        console.log(`[ERP Service] Using external DB connection`);
        const pool = this.getExternalPool(setting.value);
        const client = await pool.connect();
        try {
          // Defense-in-depth: force READ ONLY transaction at database level
          await client.query("BEGIN TRANSACTION READ ONLY");
          const res = await client.query(query);
          await client.query("COMMIT");
          return res.rows;
        } catch (err) {
          await client.query("ROLLBACK").catch(() => {});
          throw err;
        } finally {
          client.release();
        }
      }

      console.log(`[ERP Service] Using mock DB fallback`);
      // For Prisma mock DB: wrap in read-only transaction
      const results: any[] = await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
        return tx.$queryRawUnsafe(query);
      });
      return results;
    } catch (error: any) {
      console.error(`[ERP Service] SQL Execution Error: ${error.message}`);
      throw new Error(`SQL Execution failed: ${error.message}`);
    }
  }

  // ===================================
  // ERP API MODE (Mock Implementation)
  // ===================================

  /**
   * Returns the REST API documentation of the ERP to be injected into the LLM prompt.
   */
  static getErpApiInfo(): string {
    return `
    Enterprise REST API Documentation (Version 1.0):

    Endpoint 1: GET /api/v1/employees
    Description: Retrieve a list of employees.
    QueryParams: 
      - divisionName (optional): filter by division, e.g., 'IT', 'HRD'
      - status (optional): 'ACTIVE' or 'INACTIVE'
    
    Endpoint 2: GET /api/v1/salaries
    Description: Retrieve salaries for employees.
    QueryParams:
      - employeeId (optional): filter by specific employee UUID

    Rules for Querying:
      - You MUST specify the exact endpoint string (e.g. '/api/v1/employees').
      - Pass queryParams as a JSON string.
    `.trim();
  }

  /**
   * Safe executor for LLM-generated REST API calls against the Mock ERP.
   */
  static async executeMockApi(endpoint: string, queryParamsJson: string, userDivisionId?: string | null): Promise<any> {
    console.log(`[ERP Service] Executing Mock API: ${endpoint} with params ${queryParamsJson}`);
    let params: any = {};
    try {
      if (queryParamsJson) params = JSON.parse(queryParamsJson);
    } catch (e) {
      throw new Error("Invalid queryParams JSON format.");
    }

    try {
      const baseUrlSetting = await prisma.systemSetting.findUnique({ where: { key: "ERP_API_BASE_URL" } });
      const apiKeySetting = await prisma.systemSetting.findUnique({ where: { key: "ERP_API_KEY" } });

      if (baseUrlSetting && baseUrlSetting.value) {
        console.log(`[ERP Service] Using external API connection`);
        const baseUrl = baseUrlSetting.value.replace(/\/$/, "");
        const fullUrl = `${baseUrl}${endpoint}`;
        const headers: any = {};
        if (apiKeySetting && apiKeySetting.value) {
           headers["Authorization"] = `Bearer ${apiKeySetting.value}`;
        }
        
        const response = await axios.get(fullUrl, { params, headers, timeout: 15000 });
        return response.data;
      }

      console.log(`[ERP Service] Using mock API fallback`);
      if (endpoint === "/api/v1/employees") {
        const whereArgs: any = {};
        if (params.divisionName) whereArgs.divisionName = { equals: params.divisionName, mode: 'insensitive' };
        if (params.status) whereArgs.status = params.status;

        const results = await prisma.erpEmployee.findMany({ where: whereArgs, include: { salaries: true } });
        return results;
      } else if (endpoint === "/api/v1/salaries") {
        const whereArgs: any = {};
        if (params.employeeId) whereArgs.employeeId = params.employeeId;

        const results = await prisma.erpSalary.findMany({ where: whereArgs, include: { employee: true } });
        return results;
      } else {
        throw new Error(`Endpoint ${endpoint} not found (404).`);
      }
    } catch (error: any) {
      console.error(`[ERP Service] API Execution Error: ${error.message}`);
      throw new Error(`API Execution failed: ${error.message}`);
    }
  }
}
