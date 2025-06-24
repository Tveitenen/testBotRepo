// src/proxy.ts
import express from "express";
import bodyParser from "body-parser";
import { spawn } from "child_process";
import dotenv from "dotenv";
dotenv.config();

// Start MCP-serveren i stdio-modus
const mcp = spawn("server", ["stdio"], {
  stdio: ["pipe", "pipe", "inherit"],
});
mcp.stdout.setEncoding("utf8");

let buffer = "";
mcp.stdout.on("data", (chunk) => {
  buffer += chunk;
});

function readOne(): Promise<string> {
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

const app = express();
app.use(bodyParser.json());

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
