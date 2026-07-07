export interface MCPTool {
  name: string;
  description: string;
  parameters: any; // JSON schema
}

export interface MCPServer {
  name: string;
  getTools(): Promise<MCPTool[]>;
  invokeTool(toolName: string, args: any): Promise<any>;
}

export class MCPClient {
  private servers: Map<string, MCPServer> = new Map();

  registerServer(server: MCPServer) {
    this.servers.set(server.name, server);
    console.log(`[MCPClient] Registered server: ${server.name}`);
  }

  async discoverAllTools(): Promise<MCPTool[]> {
    let allTools: MCPTool[] = [];
    for (const server of this.servers.values()) {
      const tools = await server.getTools();
      allTools = allTools.concat(tools);
    }
    return allTools;
  }

  async invokeTool(serverName: string, toolName: string, args: any): Promise<any> {
    const server = this.servers.get(serverName);
    if (!server) throw new Error(`MCP Server not found: ${serverName}`);
    return server.invokeTool(toolName, args);
  }
}

// Global MCP Client instance
export const mcpClient = new MCPClient();
