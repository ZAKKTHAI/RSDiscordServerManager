
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


export async function createGuildChannel(
  botId: string,
  guildId: string,
  name: string,
  channelType: number,
  parentId: string | null = null,
  topic: string | null = null,
): Promise<void> {
  return invoke("create_guild_channel", {
    botId,
    guildId,
    name,
    channelType,
    parentId,
    topic,
  });
}

export async function deleteGuildChannel(
  botId: string,
  channelId: string,
): Promise<void> {
  return invoke("delete_guild_channel", {
    botId,
    channelId,
  });
}

export async function editGuildChannel(
  botId: string,
  channelId: string,
  name: string,
): Promise<void> {
  return invoke("edit_guild_channel", {
    botId,
    channelId,
    name,
  });
}
