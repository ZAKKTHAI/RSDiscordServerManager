export type BotProfile = {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
};
export type GuildProfile = {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  publicUpdatesChannelId: string | null;
  rulesChannelId: string | null;
  afkChannelId: string | null;
  systemChannelId: string | null;
};

export type ChannelProfile = {
  id: string;
  guildId: string;
  name: string;
  channelType: number;
};

export type RoleProfile = {
  id: string;
  guildId: string;
  name: string;
  color: number;
  hoist: boolean;
  mentionable: boolean;
  position: number;
  permissions: string;
  managed: boolean;
};

export type MemberProfile = {
  id: string;
  username: string;
  displayName: string | null;
  nickname: string | null;
  avatar: string | null;
  roles: string[];
  bot: boolean;
};
