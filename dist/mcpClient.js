"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMcpClient = getMcpClient;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const index_js_1 = require("@modelcontextprotocol/sdk/client/index.js");
const streamableHttp_js_1 = require("@modelcontextprotocol/sdk/client/streamableHttp.js");
let mcpClient = null;
async function getMcpClient() {
    if (mcpClient)
        return mcpClient;
    const token = process.env.GITHUB_TOKEN;
    if (!token)
        throw new Error("GITHUB_MCP_PAT must be set in .env");
    const endpoint = "https://api.githubcopilot.com/mcp/";
    const url = new URL(endpoint);
    // Pass your Authorization header via `requestInit`
    const transport = new streamableHttp_js_1.StreamableHTTPClientTransport(url, {
        requestInit: {
            headers: {
                Authorization: `Bearer ${token}`,
            }
        }
    });
    mcpClient = new index_js_1.Client({
        name: "github-mcp-client",
        version: "1.0.0",
        transport
    });
    await mcpClient.connect(transport);
    return mcpClient;
}
