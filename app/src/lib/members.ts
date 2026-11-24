import { invoke } from "@tauri-apps/api/core";
import type { MemberProfile } from "../types";

export async function listGuildMembers(
  botId: string,
  guildId: string,
): Promise<MemberProfile[]> {
  return invoke<MemberProfile[]>("list_guild_members", {
    botId,
    guildId,
  });
}
export async function addMemberRole(
  botId: string,
  guildId: string,
  userId: string,
  roleId: string,
): Promise<void> {
  return invoke("add_member_role", {
    botId,
    guildId,
    userId,
    roleId,
  });
}

export async function removeMemberRole(
  botId: string,
  guildId: string,
  userId: string,
  roleId: string,
): Promise<void> {
  return invoke("remove_member_role", {
    botId,
    guildId,
    userId,
    roleId,
  });
}
