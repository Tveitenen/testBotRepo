// src/mock-edge-ai/server.ts
import dotenv from "dotenv";
dotenv.config();

import express, { RequestHandler } from "express";
import { OpenAI } from "openai";
import { getMcpClient } from "./mcpClient";

interface ChatRequest { message: string }
interface ChatResponse { reply: string }

type SessionMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content?: string; function_call?: any }
  | { role: "function"; name: string; content: string };

type Session = { messages: SessionMessage[] };

const sessions = new Map<string, Session>();
const app = express();
app.use(express.json());
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Hjelpefunksjon for å mappe MCP-verktøy til OpenAI-funksjoner
function toFunctionSpec(tool: any) {
  // Remove owner/repo from parameters so model doesn't need to supply them
  const schema = tool.inputSchema;
  const props = { ...schema.properties };
  delete props.owner;
  delete props.repo;
  const required = Array.isArray(schema.required)
    ? schema.required.filter((r: string) => r !== 'owner' && r !== 'repo')
    : [];
  return {
    name: tool.name,
    description: tool.description,
    parameters: {
      type: 'object' as const,
      properties: props,
      required: required as string[]
    }
  };
};


// Chat-handler
const chatHandler: RequestHandler<{}, ChatResponse, ChatRequest> = async (req, res) => {
  const sessionId = (req.headers["x-session-id"] as string) || "default";
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      messages: [{ role: "system", content: "Du er en support-bot for GitHub Issues. Bruk alltid repo 'testBotRepo'." }]
    });
  }
  const session = sessions.get(sessionId)!;
  session.messages.push({ role: "user", content: req.body.message });

  // 1) Hent liste over tilgjengelige verktøy fra MCP-serveren
  const client = await getMcpClient();
  const rawTools = await client.listTools();
  let tools: any[] = [];
  if (Array.isArray(rawTools)) tools = rawTools;
  else if (rawTools && Array.isArray((rawTools as any).content)) tools = (rawTools as any).content;
  else if (rawTools && Array.isArray((rawTools as any).tools)) tools = (rawTools as any).tools;

  // 2) Filtrer issue-relaterte verktøy og bygg funksjonsspesifikasjon
  const issueFuncs = tools
    .filter(t => t.name.includes("issue"))
    .map(toFunctionSpec);

  // 3) Første LLM-kall
  const baseParams = { model: "gpt-4o", messages: session.messages, temperature: 0 };
  const params = issueFuncs.length > 0
    ? { ...baseParams, functions: issueFuncs, function_call: "auto" as const }
    : baseParams;
  const response1 = await openai.chat.completions.create(params);
  const msg1 = response1.choices[0].message!;

  if (msg1.function_call) {
    // 4) Modell kaller et MCP-verktøy
    const { name, arguments: argsJson } = msg1.function_call;
    const args = JSON.parse(argsJson!);
    session.messages.push({ role: "assistant", function_call: { name, arguments: argsJson } });

    // 5) Utfør verktøykallet med robust error-håndtering
    // 5) Dynamisk hent owner (env eller get_me)
    let owner = process.env.GITHUB_OWNER;
    if (!owner) {
      try {
        const meRes = await client.callTool({ name: "get_me", arguments: {} });
        const meText = Array.isArray(meRes.content) && meRes.content[0].text
          ? meRes.content[0].text
          : JSON.stringify(meRes.content);
        const meJson = JSON.parse(meText);
        owner = meJson.login;
      } catch (e) {
        console.error("Feil ved henting av brukerinfo:", e);
        owner = "Tveitenen";
      }
    }
    let toolOutput: string;
    try {
      const callResult = await client.callTool({
        name,
        arguments: {
          owner: process.env.GITHUB_OWNER || "Tveitenen",
          repo:  process.env.GITHUB_REPO   || "testBotRepo",
          ...args
        }
      });
      toolOutput = Array.isArray(callResult.content) && callResult.content[0].text
        ? callResult.content[0].text
        : JSON.stringify(callResult.content);
    } catch (err: any) {
      console.error("MCP tool error:", err);
      toolOutput = `Beklager, kunne ikke fullføre operasjonen: ${err.message}`;
    }
    session.messages.push({ role: "function", name, content: toolOutput });

    // 6) Oppfølging for modellens endelige svar
    const response2 = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: session.messages,
      temperature: 0
    });
    const finalReply = response2.choices[0].message!.content!;
    session.messages.push({ role: "assistant", content: finalReply });
    res.json({ reply: finalReply });
    return;
  }

  // 7) Ingen funksjonskall fra modellen
  const reply = msg1.content!;
  session.messages.push({ role: "assistant", content: reply });
  res.json({ reply });
};

// Registrer chat-endepunkt
app.post<{}, ChatResponse, ChatRequest>("/chat", chatHandler);
const PORT = Number(process.env.PORT ?? 3001);
app.listen(PORT, () => console.log(`Mock edge-ai kjører på http://localhost:${PORT}`));
