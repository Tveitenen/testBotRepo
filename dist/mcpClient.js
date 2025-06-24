"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMcpClient = getMcpClient;
const child_process_1 = require("child_process");
const index_js_1 = require("@modelcontextprotocol/sdk/client/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/client/stdio.js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
let mcpClient = null;
async function getMcpClient() {
    if (mcpClient)
        return mcpClient;
    // 1) Start MCP‐serveren som egen prosess
    const proc = (0, child_process_1.spawn)("server", ["stdio"], {
        stdio: ["pipe", "pipe", "inherit"],
    });
    // 2) Pakk prosess‐info inn i StdioServerParameters
    const params = {
        process: proc,
        command: "server", // navnet på binaryen
        args: ["stdio"], // samme args som du spawner med
    };
    // 3) Opprett transport og client
    const transport = new stdio_js_1.StdioClientTransport(params);
    mcpClient = new index_js_1.Client({ name: "edge-ai-client", version: "1.0.0" });
    await mcpClient.connect(transport);
    return mcpClient;
}
