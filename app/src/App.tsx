import { useCallback, useEffect, useState } from "react";
import { authorizeBot, listBots, removeBot } from "./lib/bots";
import { connectBotGateway, listBotGuilds } from "./lib/guilds";
import {
  listGuildChannels,
  createGuildChannel,
  deleteGuildChannel,
} from "./lib/channels";
import { listGuildRoles } from "./lib/roles";
import { sendChannelMessage } from "./lib/messages";
import {
  listGuildMembers,
  addMemberRole,
  removeMemberRole,
} from "./lib/members";

import type {
  BotProfile,
  GuildProfile,
  ChannelProfile,
  RoleProfile,
  MemberProfile,
} from "./types";
import "./App.css";

function App() {
  const [bots, setBots] = useState<BotProfile[]>([]);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [guildsByBot, setGuildsByBot] = useState<
    Record<string, GuildProfile[]>
  >({});
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [guildLoadingId, setGuildLoadingId] = useState<string | null>(null);
  const [selectedGuildByBot, setSelectedGuildByBot] = useState<
    Record<string, string>
  >({});

  const [channelsByGuild, setChannelsByGuild] = useState<
    Record<string, ChannelProfile[]>
    >({});

  const [sendingKey, setSendingKey] = useState<string | null>(null);

  const [rolesByGuild, setRolesByGuild] = useState<
    Record<string, RoleProfile[]>
    >({});

  const [membersByGuild, setMembersByGuild] = useState<
    Record<string, MemberProfile[]>
  >({});

  const [channelLoadingKey, setChannelLoadingKey] = useState<string | null>(
    null,
  );
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelType, setNewChannelType] = useState<number>(0);
  const [newChannelParentId, setNewChannelParentId] = useState("");
  const [newChannelTopic, setNewChannelTopic] = useState("");
  const [channelCreatingKey, setChannelCreatingKey] = useState<string | null>(
    null,
  );
  const [selectedChannelByBot, setSelectedChannelByBot] = useState<
    Record<string, string>
  >({});

  const [messageByBot, setMessageByBot] = useState<Record<string, string>>(
    {},
  );

  const [roleActionKey, setRoleActionKey] = useState<string | null>(null);

  const [pendingRoleChangesByGuild, setPendingRoleChangesByGuild] = useState<
    Record<
      string,
      Array<{
        userId: string;
        roleId: string;
        action: "add" | "remove";
      }>
    >
  >({});

  const refreshBots = useCallback(async () => {
    try {
      const result = await listBots();
      setBots(result);
    } catch (err) {
      setError(String(err));
    }
  }, []);

  useEffect(() => {
    void refreshBots();
  }, [refreshBots]);

  async function handleAuthorize(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!token.trim() || loading) return;

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const profile = await authorizeBot(token);

      setToken("");
      setMessage(`${profile.username} を登録しました。`);

      await refreshBots();
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(bot: BotProfile) {
    const confirmed = window.confirm(
      `${bot.username} を削除しますか？\n保存されたBot Tokenも削除されます。`,
    );

    if (!confirmed || removingId) return;

    setRemovingId(bot.id);
    setError("");
    setMessage("");

    try {
      await removeBot(bot.id);
      setBots((current) => current.filter((item) => item.id !== bot.id));
      setMessage(`${bot.username} を削除しました。`);
    } catch (err) {
      setError(String(err));
    } finally {
      setRemovingId(null);
    }
  }

  async function handleConnectGateway(bot: BotProfile) {
    setConnectingId(bot.id);
    setError("");
    setMessage("");

    try {
      await connectBotGateway(bot.id);
      setMessage(`${bot.username} のGateway接続を開始しました。`);

      // GatewayからGuildCreateイベントが届くまで少し待って一覧を取得
      setGuildLoadingId(bot.id);
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const guilds = await listBotGuilds(bot.id);
      setGuildsByBot((current) => ({
        ...current,
        [bot.id]: guilds,
      }));
    } catch (err) {
      setError(String(err));
    } finally {
      setConnectingId(null);
      setGuildLoadingId(null);
    }
  }

  async function handleSelectGuild(botId: string, guildId: string) {
    const key = `${botId}:${guildId}`;

    setSelectedGuildByBot((current) => ({
      ...current,
      [botId]: guildId,
    }));

    setChannelLoadingKey(key);
    setError("");

    try {
      const [channels, roles, members] = await Promise.all([
        listGuildChannels(botId, guildId),
        listGuildRoles(botId, guildId),
        listGuildMembers(botId, guildId),
      ]);

      setChannelsByGuild((current) => ({
        ...current,
        [key]: channels,
      }));

      setRolesByGuild((current) => ({
        ...current,
        [key]: roles,
      }));

      setMembersByGuild((current) => ({
        ...current,
        [key]: members,
      }));
    } catch (err) {
      setError(String(err));
    } finally {
      setChannelLoadingKey(null);
    }
  }
  async function handleCreateChannel(botId: string, guildId: string) {
    const key = `${botId}:${guildId}`;
    const name = newChannelName.trim();

    if (!name) {
      setError("Channel name cannot be empty.");
      return;
    }

    setChannelCreatingKey(key);
    setError("");
    setMessage("");

    try {
      await createGuildChannel(
        botId,
        guildId,
        name,
        newChannelType,
        newChannelParentId || null,
        newChannelType === 0 ? newChannelTopic.trim() || null : null,
      );

      const channels = await listGuildChannels(botId, guildId);

      setChannelsByGuild((current) => ({
        ...current,
        [key]: channels,
      }));

      setNewChannelName("");
      setNewChannelTopic("");
      setNewChannelParentId("");

      setMessage("Channel created successfully.");
    } catch (err) {
      setError(String(err));
    } finally {
      setChannelCreatingKey(null);
    }
  }

  async function handleDeleteChannel(
    botId: string,
    guildId: string,
    channelId: string,
    channelName: string,
  ) {
    const confirmed = window.confirm(
      `「${channelName}」を削除しますか？\nこの操作は取り消せません。`,
    );

    if (!confirmed) return;

    const key = `${botId}:${guildId}`;
    setChannelCreatingKey(key);
    setError("");
    setMessage("");

    try {
      await deleteGuildChannel(botId, channelId);

      const channels = await listGuildChannels(botId, guildId);

      setChannelsByGuild((current) => ({
        ...current,
        [key]: channels,
      }));

      setSelectedChannelByBot((current) => {
        if (current[botId] !== channelId) return current;

        const next = { ...current };
        delete next[botId];
        return next;
      });

      setMessage(`「${channelName}」を削除しました。`);
    } catch (err) {
      setError(String(err));
    } finally {
      setChannelCreatingKey(null);
    }
  }

  function handleMemberRole(
    botId: string,
    guildId: string,
    userId: string,
    roleId: string,
    action: "add" | "remove",
  ) {
    const key = `${botId}:${guildId}`;

    setPendingRoleChangesByGuild((current) => {
      const changes = current[key] ?? [];

      // 同じメンバー・ロールの変更は最新の操作で上書き
      const filtered = changes.filter(
        (change) =>
          !(change.userId === userId && change.roleId === roleId),
      );

      // 現在のDiscord上の状態と同じなら変更を登録しない
      const member = (membersByGuild[key] ?? []).find(
        (item) => item.id === userId,
      );

      const alreadyHasRole = member?.roles.includes(roleId) ?? false;

      if (
        (action === "add" && alreadyHasRole) ||
        (action === "remove" && !alreadyHasRole)
      ) {
        return {
          ...current,
          [key]: filtered,
        };
      }

      return {
        ...current,
        [key]: [
          ...filtered,
          { userId, roleId, action },
        ],
      };
    });
  }

  async function handleApplyRoleChanges(botId: string, guildId: string) {
    const key = `${botId}:${guildId}`;
    const changes = pendingRoleChangesByGuild[key] ?? [];

    if (changes.length === 0 || roleActionKey !== null) return;

    setRoleActionKey(key);
    setError("");
    setMessage("");

    const succeeded: typeof changes = [];
    const failed: typeof changes = [];

    for (const change of changes) {
      try {
        if (change.action === "add") {
          await addMemberRole(
            botId,
            guildId,
            change.userId,
            change.roleId,
          );
        } else {
          await removeMemberRole(
            botId,
            guildId,
            change.userId,
            change.roleId,
          );
        }

        succeeded.push(change);
      } catch {
        failed.push(change);
      }
    }

    if (succeeded.length > 0) {
      setMembersByGuild((current) => ({
        ...current,
        [key]: (current[key] ?? []).map((member) => {
          const memberChanges = succeeded.filter(
            (change) => change.userId === member.id,
          );

          if (memberChanges.length === 0) return member;

          const roles = new Set(member.roles);

          for (const change of memberChanges) {
            if (change.action === "add") {
              roles.add(change.roleId);
            } else {
              roles.delete(change.roleId);
            }
          }

          return {
            ...member,
            roles: [...roles],
          };
        }),
      }));
    }

    setPendingRoleChangesByGuild((current) => ({
      ...current,
      [key]: failed,
    }));

    if (failed.length === 0) {
      setMessage(`${succeeded.length}件の変更を反映しました。`);
    } else {
      setError(
        `${succeeded.length}件成功、${failed.length}件失敗しました。失敗分は保留中です。`,
      );
    }

    setRoleActionKey(null);
  }

  async function handleSendMessage(botId: string) {
    const channelId = selectedChannelByBot[botId];
    const content = messageByBot[botId] ?? "";

    if (!channelId || !content.trim() || sendingKey) return;

    const key = `${botId}:${channelId}`;

    setSendingKey(key);
    setError("");
    setMessage("");

    try {
      await sendChannelMessage(botId, channelId, content);

      setMessageByBot((current) => ({
        ...current,
        [botId]: current[botId] === content ? "" : current[botId],
      }));

      setMessage("Discordへのメッセージ送信に成功しました。");
    } catch (err) {
      setError(String(err));
    } finally {
      setSendingKey(null);
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">D</div>
          <div>
            <strong>Discord Manager</strong>
            <span>Server Management</span>
          </div>
        </div>

        <nav className="navigation">
          <div className="nav-item active">
            <span>▦</span>
            Bot Management
          </div>
        </nav>

        <div className="sidebar-footer">
          <span className="status-dot" />
          Local Application
        </div>
      </aside>

      <section className="main-content">
        <header className="topbar">
          <span className="breadcrumb">Dashboard / Bot Management</span>
          <span className="version">v0.1.0</span>
        </header>

        <div className="page-content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">DISCORD INTEGRATION</p>
              <h1>Bot Management</h1>
              <p className="subtitle">
                Register and manage your Discord bots.
              </p>
            </div>

            <div className="bot-count">
              <span>{bots.length}</span>
              <small>Registered Bots</small>
            </div>
          </div>

          {error && (
            <div className="notice error">
              <strong>Error</strong>
              <span>{error}</span>
              <button onClick={() => setError("")}>×</button>
            </div>
          )}

          {message && (
            <div className="notice success">
              <strong>Success</strong>
              <span>{message}</span>
              <button onClick={() => setMessage("")}>×</button>
            </div>
          )}

          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Register a Bot</h2>
                <p>Connect a bot using its Discord Bot Token.</p>
              </div>
              <span className="panel-icon">＋</span>
            </div>

            <form onSubmit={handleAuthorize}>
              <label htmlFor="bot-token">Bot Token</label>

              <div className="token-input">
                <input
                  id="bot-token"
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.currentTarget.value)}
                  placeholder="Enter your Discord Bot Token"
                  autoComplete="off"
                  spellCheck={false}
                  disabled={loading}
                />

                <button
                  type="submit"
                  disabled={loading || !token.trim()}
                >
                  {loading ? "Verifying..." : "Register Bot"}
                </button>
              </div>

              <p className="field-help">
                Your token is validated through Discord API and stored
                securely in your operating system's credential manager.
              </p>
            </form>
          </section>


          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Registered Bots</h2>
                <p>Manage your registered Discord bot accounts.</p>
              </div>

              <button
                className="refresh-button"
                onClick={() => void refreshBots()}
                disabled={loading || removingId !== null}
              >
                ↻ Refresh
              </button>
            </div>

            {bots.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">◇</div>
                <strong>No bots registered</strong>
                <p>Register your first Discord bot to get started.</p>
              </div>
            ) : (
              <div className="bot-list">
                {bots.map((bot) => (
                  <div key={bot.id}>
                    <article className="bot-item">
                      <div className="bot-avatar">
                        {bot.avatar ? (
                          <img
                            src={`https://cdn.discordapp.com/avatars/${bot.id}/${bot.avatar}.png`}
                            alt=""
                          />
                        ) : (
                          bot.username.charAt(0).toUpperCase()
                        )}
                      </div>

                      <div className="bot-info">
                        <strong>{bot.displayName || bot.username}</strong>
                        <span>@{bot.username}</span>
                        <small>ID: {bot.id}</small>
                      </div>

                      <div className="bot-status">
                        <span className="status-dot" />
                        Registered
                      </div>

                      <button
                        className="refresh-button"
                        onClick={() => void handleConnectGateway(bot)}
                        disabled={connectingId !== null || removingId !== null}
                      >
                        {connectingId === bot.id
                          ? "Connecting..."
                          : "Connect Gateway"}
                      </button>

                      <button
                        className="delete-button"
                        onClick={() => void handleRemove(bot)}
                        disabled={removingId !== null || connectingId === bot.id}
                      >
                        {removingId === bot.id ? "Deleting..." : "Delete"}
                      </button>
                    </article>

                    {guildLoadingId === bot.id && (
                      <p className="field-help">Loading Discord servers...</p>
                    )}

                    {guildsByBot[bot.id] && (
                      <div className="guild-list">
                        <h3>Joined Servers ({guildsByBot[bot.id].length})</h3>

                        {guildsByBot[bot.id].length === 0 ? (
                          <p className="field-help">
                            No servers received yet. Try refreshing after a moment.
                          </p>
                        ) : (
                          guildsByBot[bot.id].map((guild) => (
                            <button
                              type="button"
                              className={`guild-item guild-select ${
                                selectedGuildByBot[bot.id] === guild.id ? "selected" : ""
                              }`}
                              key={guild.id}
                              onClick={() => void handleSelectGuild(bot.id, guild.id)}
                            >
                              <div className="guild-avatar">
                                {guild.icon ? (
                                  <img
                                    src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                                    alt=""
                                  />
                                ) : (
                                  guild.name.charAt(0).toUpperCase()
                                )}
                              </div>

                              <div className="guild-info">
                                <strong>{guild.name}</strong>
                                <small>{guild.id}</small>
                              </div>

                              {guild.owner && (
                                <span className="guild-owner">Owner</span>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                    {selectedGuildByBot[bot.id] && (() => {
                      const guildId = selectedGuildByBot[bot.id];
                      const key = `${bot.id}:${guildId}`;
                      const selectedGuild = guildsByBot[bot.id]?.find(
                        (guild) => guild.id === guildId,
                      );

                      return (
                        <div className="channel-panel">
                          <h3>
                            Channels
                            {selectedGuild ? ` / ${selectedGuild.name}` : ""}
                          </h3>

                          <div className="channel-create-form">
                            <h4>Create Channel</h4>

                            <input
                              type="text"
                              placeholder="Channel name"
                              value={newChannelName}
                              onChange={(event) => setNewChannelName(event.target.value)}
                            />

                            <select
                              value={newChannelType}
                              onChange={(event) => setNewChannelType(Number(event.target.value))}
                            >
                              <option value={4}>Category</option>
                              <option value={0}>Text Channel</option>
                              <option value={2}>Voice Channel</option>
                            </select>

                            {newChannelType !== 4 && (
                              <select
                                value={newChannelParentId}
                                onChange={(event) => setNewChannelParentId(event.target.value)}
                              >
                                <option value="">No Category</option>
                                {(channelsByGuild[key] ?? [])
                                  .filter((channel) => channel.channelType === 4)
                                  .map((category) => (
                                    <option key={category.id} value={category.id}>
                                      {category.name}
                                    </option>
                                  ))}
                              </select>
                            )}

                            {newChannelType === 0 && (
                              <input
                                type="text"
                                placeholder="Channel topic (optional)"
                                value={newChannelTopic}
                                onChange={(event) => setNewChannelTopic(event.target.value)}
                              />
                            )}

                            <button
                              type="button"
                              disabled={!newChannelName.trim() || channelCreatingKey === key}
                              onClick={() => void handleCreateChannel(bot.id, guildId)}
                            >
                              {channelCreatingKey === key ? "Creating..." : "Create Channel"}
                            </button>
                          </div>

                          {channelLoadingKey === key ? (
                            <p className="field-help">Loading channels...</p>
                          ) : channelsByGuild[key]?.length ? (
                            <div className="channel-list">
                              {channelsByGuild[key].map((channel) => (
                                <div className="channel-row" key={channel.id}>
                                  <button
                                    type="button"
                                    className={`channel-item channel-select ${
                                      selectedChannelByBot[bot.id] === channel.id ? "selected" : ""
                                    }`}
                                    onClick={() =>
                                      setSelectedChannelByBot((current) => ({
                                        ...current,
                                        [bot.id]: channel.id,
                                      }))
                                    }
                                  >
                                    <span className="channel-hash">
                                      {channel.channelType === 4
                                        ? "▾"
                                        : channel.channelType === 2
                                          ? "🔊"
                                          : "#"}
                                    </span>
                                    <span>{channel.name}</span>

                                    {selectedGuild?.publicUpdatesChannelId === channel.id && (
                                      <span className="channel-special-label">
                                        Community Updates
                                      </span>
                                    )}

                                    {selectedGuild?.rulesChannelId === channel.id && (
                                      <span className="channel-special-label">
                                        Rules
                                      </span>
                                    )}

                                    {selectedGuild?.afkChannelId === channel.id && (
                                      <span className="channel-special-label">
                                        AFK
                                      </span>
                                    )}

                                    {selectedGuild?.systemChannelId === channel.id && (
                                      <span className="channel-special-label">
                                        System
                                      </span>
                                    )}
                                    {selectedChannelByBot[bot.id] === channel.id && (
                                      <span className="channel-selected-mark">Selected</span>
                                    )}
                                  </button>

                                  <button
                                    type="button"
                                    className="channel-delete-button"
                                    disabled={channelCreatingKey === key}
                                    onClick={() =>
                                      void handleDeleteChannel(
                                        bot.id,
                                        guildId,
                                        channel.id,
                                        channel.name,
                                      )
                                    }
                                    title={`Delete ${channel.name}`}
                                  >
                                    Delete
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="field-help">
                              No text channels found.
                            </p>
                          )}
                        </div>
                      );
                    })()}
                    {selectedGuildByBot[bot.id] && (() => {
                      const key = `${bot.id}:${selectedGuildByBot[bot.id]}`;
                      const roles = rolesByGuild[key] ?? [];

                      return (
                        <div className="role-panel">
                          <h3>Roles ({roles.length})</h3>

                          {channelLoadingKey === key ? (
                            <p className="field-help">Loading roles...</p>
                          ) : roles.length > 0 ? (
                            <div className="role-list">
                              {roles.map((role) => (
                                <div className="role-item" key={role.id}>
                                  <span
                                    className="role-color"
                                    style={{
                                      backgroundColor:
                                        role.color === 0
                                          ? "#99aab5"
                                          : `#${role.color.toString(16).padStart(6, "0")}`,
                                    }}
                                  />
                                  <div className="role-info">
                                    <strong>{role.name}</strong>
                                    <small>
                                      Position: {role.position}
                                      {role.managed ? " / Managed" : ""}
                                    </small>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="field-help">No roles found.</p>
                          )}
                        </div>
                      );
                    })()}
                    {selectedGuildByBot[bot.id] && (() => {
                      const key = `${bot.id}:${selectedGuildByBot[bot.id]}`;
                      const members = membersByGuild[key] ?? [];
                      const roles = rolesByGuild[key] ?? [];
                      const pendingChanges = pendingRoleChangesByGuild[key] ?? [];

                      return (
                        <div className="member-panel">
                          <div className="member-panel-header">
                            <h3>Members ({members.length})</h3>

                            <div className="member-bulk-actions">
                              <span className="pending-count">
                                未反映: {pendingChanges.length}件
                              </span>

                              <button
                                type="button"
                                className="member-apply-button"
                                disabled={
                                  pendingChanges.length === 0 ||
                                  roleActionKey !== null
                                }
                                onClick={() =>
                                  void handleApplyRoleChanges(
                                    bot.id,
                                    selectedGuildByBot[bot.id],
                                  )
                                }
                              >
                                {roleActionKey === key ? "反映中..." : "変更を一括反映"}
                              </button>
                            </div>
                          </div>

                          {channelLoadingKey === key ? (
                            <p className="field-help">Loading members...</p>
                          ) : members.length > 0 ? (
                            <div className="member-list">
                              {members.map((member) => (
                                <div className="member-item" key={member.id}>
                                  <div className="member-info">
                                    <strong>
                                      {member.nickname ||
                                        member.displayName ||
                                        member.username}
                                    </strong>
                                    <small>
                                      @{member.username}
                                      {member.bot ? " / Bot" : ""}
                                    </small>

                                    <div className="member-roles">
                                      {member.roles.length > 0 ? (
                                        member.roles.map((roleId) => {
                                          const role = roles.find((item) => item.id === roleId);

                                          return (
                                            <span className="member-role-item" key={roleId}>
                                              <span className="member-role">
                                                {role?.name ?? roleId}
                                              </span>

                                              {role && role.id !== selectedGuildByBot[bot.id] && (
                                                <button
                                                  className="member-role-remove"
                                                  type="button"
                                                  disabled={roleActionKey !== null || role.managed}
                                                  onClick={() =>
                                                    void handleMemberRole(
                                                      bot.id,
                                                      selectedGuildByBot[bot.id],
                                                      member.id,
                                                      role.id,
                                                      "remove",
                                                    )
                                                  }
                                                >
                                                  ×
                                                </button>
                                              )}
                                            </span>
                                          );
                                        })
                                      ) : (
                                        <span className="field-help">No roles</span>
                                      )}
                                    </div>

                                    <div className="member-role-add">
                                      <select
                                        defaultValue=""
                                        disabled={roleActionKey !== null}
                                        onChange={(e) => {
                                          const roleId = e.currentTarget.value;
                                          if (!roleId) return;

                                          void handleMemberRole(
                                            bot.id,
                                            selectedGuildByBot[bot.id],
                                            member.id,
                                            roleId,
                                            "add",
                                          );

                                          e.currentTarget.value = "";
                                        }}
                                      >
                                        <option value="">Add role...</option>
                                        {roles
                                          .filter(
                                            (role) =>
                                              role.id !== selectedGuildByBot[bot.id] &&
                                              !role.managed &&
                                              !member.roles.includes(role.id),
                                          )
                                          .map((role) => (
                                            <option key={role.id} value={role.id}>
                                              {role.name}
                                            </option>
                                          ))}
                                      </select>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="field-help">No members found.</p>
                          )}
                        </div>
                      );
                    })()}
                    {selectedChannelByBot[bot.id] && (
                      <div className="message-composer">
                        <h3>Send Message</h3>

                        <textarea
                          value={messageByBot[bot.id] ?? ""}
                          onChange={(e) => {
                            const value = e.currentTarget.value;

                            setMessageByBot((current) => ({
                              ...current,
                              [bot.id]: value,
                            }));
                          }}
                          placeholder="Type your message..."
                          maxLength={2000}
                          rows={4}
                          disabled={
                            sendingKey ===
                            `${bot.id}:${selectedChannelByBot[bot.id]}`
                          }
                        />

                        <div className="composer-footer">
                          <span className="field-help">
                            {(messageByBot[bot.id] ?? "").length}/2000
                          </span>

                          <button
                            type="button"
                            onClick={() => void handleSendMessage(bot.id)}
                            disabled={
                              !messageByBot[bot.id]?.trim() ||
                              sendingKey !== null
                            }
                          >
                            {sendingKey ===
                            `${bot.id}:${selectedChannelByBot[bot.id]}`
                              ? "Sending..."
                              : "Send Message"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>


          <p className="security-note">
            <span>◆</span>
            Bot tokens are never stored in browser storage or returned to
            the frontend after registration.
          </p>
        </div>
      </section>
    </main>
  );
}

export default App;
