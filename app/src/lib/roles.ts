import { invoke } from "@tauri-apps/api/core";
import type { RoleProfile } from "../types";

export async function listGuildRoles(
  botId: string,
  guildId: string,
): Promise<RoleProfile[]> {
  return invoke<RoleProfile[]>("list_guild_roles", {
    botId,
    guildId,
  });
}
