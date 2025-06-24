"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMcpClient = getMcpClient;
// src/mcpClient.ts
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const index_js_1 = require("@modelcontextprotocol/sdk/client/index.js");
const streamableHttp_js_1 = require("@modelcontextprotocol/sdk/client/streamableHttp.js");
const MCP_URL = process.env.MCP_ENDPOINT;
if (!MCP_URL)
    throw new Error('MCP_ENDPOINT mangler i env');
// Create a URL instance and pass it directly:
const transport = new streamableHttp_js_1.StreamableHTTPClientTransport(new URL(MCP_URL), {
// streaming is true by default; if you want to disable SSE,
// you can explicitly turn it off:
// streaming: false
});
let mcpClient = null;
async function getMcpClient() {
    if (mcpClient)
        return mcpClient;
    mcpClient = new index_js_1.Client({ name: 'mock-edge-ai-client', version: '1.0.0' });
    await mcpClient.connect(transport);
    return mcpClient;
}
