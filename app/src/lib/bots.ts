import { invoke } from "@tauri-apps/api/core";
import type { BotProfile } from "../types";

export async function authorizeBot(token: string): Promise<BotProfile> {
  return invoke<BotProfile>("authorize_bot", { token });
}

export async function listBots(): Promise<BotProfile[]> {
  return invoke<BotProfile[]>("list_bots");
}

export async function removeBot(botId: string): Promise<void> {
  return invoke("remove_bot_token", { botId });
}
