import { MCPServer, MCPTool, mcpClient } from "./mcp-client";

export class ERP_MCPServer implements MCPServer {
  name = "erp_server";

  async getTools(): Promise<MCPTool[]> {
    return [
      {
        name: "query_erp_sql",
        description: "Executes a SQL query against the ERP database",
        parameters: {
          type: "object",
          properties: {
            sql: { type: "string", description: "The SQL query to execute" }
          },
          required: ["sql"]
        }
      }
    ];
  }

  async invokeTool(toolName: string, args: any): Promise<any> {
    if (toolName === "query_erp_sql") {
      console.log(`[ERP_MCPServer] Executing SQL: ${args.sql}`);
      // In a real implementation, call ERP Service / Prisma DB
      return { result: "Success", data: [] };
    }
    throw new Error(`Unknown tool: ${toolName}`);
  }
}

// Auto-register
mcpClient.registerServer(new ERP_MCPServer());
