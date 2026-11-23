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
};

export type ChannelProfile = {
  id: string;
  guildId: string;
  name: string;
  channelType: number;
};
