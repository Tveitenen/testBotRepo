"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/proxy.ts
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const child_process_1 = require("child_process");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Start MCP-serveren i stdio-modus
const mcp = (0, child_process_1.spawn)("server", ["stdio"], {
    stdio: ["pipe", "pipe", "inherit"],
});
mcp.stdout.setEncoding("utf8");
let buffer = "";
mcp.stdout.on("data", (chunk) => {
    buffer += chunk;
});
function readOne() {
    return new Promise((resolve) => {
        const interval = setInterval(() => {
            const idx = buffer.indexOf("\n");
            if (idx !== -1) {
                const line = buffer.slice(0, idx);
                buffer = buffer.slice(idx + 1);
                clearInterval(interval);
                resolve(line);
            }
        }, 5);
    });
}
const app = (0, express_1.default)();
app.use(body_parser_1.default.json());
app.post("/mcp", async (req, res) => {
    // Send request til MCP
    const reqJson = JSON.stringify(req.body);
    mcp.stdin.write(reqJson + "\n");
    // Vent på respons
    const respLine = await readOne();
    res.json(JSON.parse(respLine));
});
const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
    console.log(`Proxy listening on http://0.0.0.0:${port}`);
});
