// src/mcpClient.ts

import dotenv from "dotenv";
dotenv.config();

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

let mcpClient: Client | null = null;

export async function getMcpClient(): Promise<Client> {
  if (mcpClient) return mcpClient;

  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_MCP_PAT must be set in .env");

  const endpoint = "https://api.githubcopilot.com/mcp/";
  const url = new URL(endpoint);

  // Pass your Authorization header via `requestInit`
  const transport = new StreamableHTTPClientTransport(url, {
    requestInit: {
      headers: {
        Authorization: `Bearer ${token}`,
      }
    }
  });

  mcpClient = new Client({
    name: "github-mcp-client",
    version: "1.0.0",
    transport
  });
  await mcpClient.connect(transport);

  return mcpClient;
}
