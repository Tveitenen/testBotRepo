// src/mcpClient.ts
import dotenv from 'dotenv';
dotenv.config();

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const MCP_URL = process.env.MCP_ENDPOINT;
if (!MCP_URL) throw new Error('MCP_ENDPOINT mangler i env');

// Create a URL instance and pass it directly:
const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), {
  // streaming is true by default; if you want to disable SSE,
  // you can explicitly turn it off:
  // streaming: false
});

let mcpClient: Client|null = null;
export async function getMcpClient(): Promise<Client> {
  if (mcpClient) return mcpClient;
  mcpClient = new Client({ name:'mock-edge-ai-client', version:'1.0.0' });
  await mcpClient.connect(transport);
  return mcpClient;
}
