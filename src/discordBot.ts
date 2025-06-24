// src/discordBot.ts
import dotenv from "dotenv";
dotenv.config();

import { Client, GatewayIntentBits, TextChannel } from "discord.js";
import fetch from "node-fetch";

// Fallback hvis .env mangler EDGE_AI_URL
const EDGE_AI_URL = process.env.MCP_ENDPOINT;
if (!EDGE_AI_URL) throw new Error("MCP_ENDPOINT mangler i env");

const DISCORD_TOKEN = process.env.DISCORD_TOKEN!;
if (!DISCORD_TOKEN) throw new Error("DISCORD_TOKEN mangler i .env");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("ready", () => {
  console.log(`Discord-bot klar: ${client.user?.tag}`);
  console.log(`Sender forespørsler til: ${EDGE_AI_URL}/chat`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!(message.channel instanceof TextChannel)) return;

  const tekst = message.content.trim();
  if (!tekst) return;

  message.channel.sendTyping();

  try {
    const resp = await fetch(`${EDGE_AI_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-session-id": message.author.id,
      },
      body: JSON.stringify({ message: tekst }),
    });
    const { reply } = (await resp.json()) as { reply: string };
    await message.channel.send(reply);
  } catch (err) {
    console.error("Feil mot edge-ai:", err);
    await message.channel.send("Beklager, noe gikk galt med AI-tjenesten.");
  }
});

client.login(DISCORD_TOKEN);
