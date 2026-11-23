
import { invoke } from "@tauri-apps/api/core";
import type { GuildProfile } from "../types";

export async function connectBotGateway(botId: string): Promise<void> {
  return invoke("connect_bot_gateway", { botId });
}

export async function listBotGuilds(
  botId: string,
): Promise<GuildProfile[]> {
  return invoke<GuildProfile[]>("list_bot_guilds", { botId });
}
