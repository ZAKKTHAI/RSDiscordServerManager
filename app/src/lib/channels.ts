
import { invoke } from "@tauri-apps/api/core";
import type { ChannelProfile } from "../types";

export async function listGuildChannels(
  botId: string,
  guildId: string,
): Promise<ChannelProfile[]> {
  return invoke<ChannelProfile[]>("list_guild_channels", {
    botId,
    guildId,
  });
}
