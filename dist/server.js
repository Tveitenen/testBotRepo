"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/mock-edge-ai/server.ts
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const openai_1 = require("openai");
const mcpClient_1 = require("./mcpClient");
const sessions = new Map();
const app = (0, express_1.default)();
app.use(express_1.default.json());
const openai = new openai_1.OpenAI({ apiKey: process.env.OPENAI_API_KEY });
// Hjelpefunksjon for å mappe MCP-verktøy til OpenAI-funksjoner
function toFunctionSpec(tool) {
    // Remove owner/repo from parameters so model doesn't need to supply them
    const schema = tool.inputSchema;
    const props = { ...schema.properties };
    delete props.owner;
    delete props.repo;
    const required = Array.isArray(schema.required)
        ? schema.required.filter((r) => r !== 'owner' && r !== 'repo')
        : [];
    return {
        name: tool.name,
        description: tool.description,
        parameters: {
            type: 'object',
            properties: props,
            required: required
        }
    };
}
;
// Chat-handler
const chatHandler = async (req, res) => {
    const sessionId = req.headers["x-session-id"] || "default";
    if (!sessions.has(sessionId)) {
        sessions.set(sessionId, {
            messages: [{ role: "system", content: "Du er en support-bot for GitHub Issues. Bruk alltid repo 'testBotRepo'." }]
        });
    }
    const session = sessions.get(sessionId);
    session.messages.push({ role: "user", content: req.body.message });
    // 1) Hent liste over tilgjengelige verktøy fra MCP-serveren
    const client = await (0, mcpClient_1.getMcpClient)();
    const rawTools = await client.listTools();
    let tools = [];
    if (Array.isArray(rawTools))
        tools = rawTools;
    else if (rawTools && Array.isArray(rawTools.content))
        tools = rawTools.content;
    else if (rawTools && Array.isArray(rawTools.tools))
        tools = rawTools.tools;
    // 2) Filtrer issue-relaterte verktøy og bygg funksjonsspesifikasjon
    const issueFuncs = tools
        .filter(t => t.name.includes("issue"))
        .map(toFunctionSpec);
    // 3) Første LLM-kall
    const baseParams = { model: "gpt-4o", messages: session.messages, temperature: 0 };
    const params = issueFuncs.length > 0
        ? { ...baseParams, functions: issueFuncs, function_call: "auto" }
        : baseParams;
    const response1 = await openai.chat.completions.create(params);
    const msg1 = response1.choices[0].message;
    if (msg1.function_call) {
        // 4) Modell kaller et MCP-verktøy
        const { name, arguments: argsJson } = msg1.function_call;
        const args = JSON.parse(argsJson);
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
            }
            catch (e) {
                console.error("Feil ved henting av brukerinfo:", e);
                owner = "Tveitenen";
            }
        }
        let toolOutput;
        try {
            const callResult = await client.callTool({
                name,
                arguments: {
                    owner: process.env.GITHUB_OWNER || "Tveitenen",
                    repo: process.env.GITHUB_REPO || "testBotRepo",
                    ...args
                }
            });
            toolOutput = Array.isArray(callResult.content) && callResult.content[0].text
                ? callResult.content[0].text
                : JSON.stringify(callResult.content);
        }
        catch (err) {
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
        const finalReply = response2.choices[0].message.content;
        session.messages.push({ role: "assistant", content: finalReply });
        res.json({ reply: finalReply });
        return;
    }
    // 7) Ingen funksjonskall fra modellen
    const reply = msg1.content;
    session.messages.push({ role: "assistant", content: reply });
    res.json({ reply });
};
// Registrer chat-endepunkt
app.post("/chat", chatHandler);
const PORT = Number(process.env.PORT ?? 3001);
app.listen(PORT, () => console.log(`Mock edge-ai kjører på http://localhost:${PORT}`));
