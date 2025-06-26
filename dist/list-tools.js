"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// list-tools.ts
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const mcpClient_1 = require("./mcpClient");
(async () => {
    try {
        const client = await (0, mcpClient_1.getMcpClient)();
        const tools = await client.listTools();
        console.log(JSON.stringify(tools, null, 2));
        process.exit(0);
    }
    catch (err) {
        console.error("Feil ved listTools():", err);
        process.exit(1);
    }
})();
