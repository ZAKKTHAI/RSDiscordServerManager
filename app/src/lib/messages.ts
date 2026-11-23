import { invoke } from "@tauri-apps/api/core";

export async function sendChannelMessage(
  botId: string,
  channelId: string,
  content: string,
): Promise<void> {
  return invoke("send_channel_message", {
    botId,
    channelId,
    content,
  });
}
