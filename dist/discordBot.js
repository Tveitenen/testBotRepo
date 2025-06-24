"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/discordBot.ts
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const discord_js_1 = require("discord.js");
const node_fetch_1 = __importDefault(require("node-fetch"));
// Fallback hvis .env mangler EDGE_AI_URL
const EDGE_AI_URL = process.env.MCP_ENDPOINT;
if (!EDGE_AI_URL)
    throw new Error("MCP_ENDPOINT mangler i env");
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
if (!DISCORD_TOKEN)
    throw new Error("DISCORD_TOKEN mangler i .env");
const client = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMessages,
        discord_js_1.GatewayIntentBits.MessageContent,
    ],
});
client.once("ready", () => {
    console.log(`Discord-bot klar: ${client.user?.tag}`);
    console.log(`Sender forespørsler til: ${EDGE_AI_URL}/chat`);
});
client.on("messageCreate", async (message) => {
    if (message.author.bot)
        return;
    if (!(message.channel instanceof discord_js_1.TextChannel))
        return;
    const tekst = message.content.trim();
    if (!tekst)
        return;
    message.channel.sendTyping();
    try {
        const resp = await (0, node_fetch_1.default)(`${EDGE_AI_URL}/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-session-id": message.author.id,
            },
            body: JSON.stringify({ message: tekst }),
        });
        const { reply } = (await resp.json());
        await message.channel.send(reply);
    }
    catch (err) {
        console.error("Feil mot edge-ai:", err);
        await message.channel.send("Beklager, noe gikk galt med AI-tjenesten.");
    }
});
client.login(DISCORD_TOKEN);
