// list-tools.ts
import dotenv from "dotenv";
dotenv.config();

import { getMcpClient } from "./mcpClient";

(async () => {
  try {
    const client = await getMcpClient();
    const tools = await client.listTools();
    console.log(JSON.stringify(tools, null, 2));
    process.exit(0);
  } catch (err) {
    console.error("Feil ved listTools():", err);
    process.exit(1);
  }
})();
