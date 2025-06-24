import { spawn } from "child_process";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import dotenv from "dotenv";
dotenv.config();

let mcpClient: Client | null = null;
export async function getMcpClient(): Promise<Client> {
  if (mcpClient) return mcpClient;

  // 1) Start MCP‐serveren som egen prosess
  const proc = spawn("server", ["stdio"], {
    stdio: ["pipe", "pipe", "inherit"],
  });

  // 2) Pakk prosess‐info inn i StdioServerParameters
  const params = {
    process: proc,
    command: "server",       // navnet på binaryen
    args: ["stdio"],         // samme args som du spawner med
  };

  // 3) Opprett transport og client
  const transport = new StdioClientTransport(params);
  mcpClient = new Client({ name: "edge-ai-client", version: "1.0.0" });
  await mcpClient.connect(transport);

  return mcpClient;
}
