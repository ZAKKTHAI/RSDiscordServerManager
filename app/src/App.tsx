import { useCallback, useEffect, useState } from "react";
import { authorizeBot, listBots, removeBot } from "./lib/bots";
import { connectBotGateway, listBotGuilds } from "./lib/guilds";
import { listGuildChannels } from "./lib/channels";
import { sendChannelMessage } from "./lib/messages";
import type { BotProfile, GuildProfile, ChannelProfile } from "./types";
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

  const [channelLoadingKey, setChannelLoadingKey] = useState<string | null>(
    null,
  );

  const [selectedChannelByBot, setSelectedChannelByBot] = useState<
    Record<string, string>
  >({});

  const [messageByBot, setMessageByBot] = useState<Record<string, string>>(
    {},
  );

  const [sendingKey, setSendingKey] = useState<string | null>(null);

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
      const channels = await listGuildChannels(botId, guildId);

      setChannelsByGuild((current) => ({
        ...current,
        [key]: channels,
      }));
    } catch (err) {
      setError(String(err));
    } finally {
      setChannelLoadingKey(null);
    }
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

                          {channelLoadingKey === key ? (
                            <p className="field-help">Loading channels...</p>
                          ) : channelsByGuild[key]?.length ? (
                            <div className="channel-list">
                              {channelsByGuild[key].map((channel) => (
                                <button
                                  type="button"
                                  className={`channel-item channel-select ${
                                    selectedChannelByBot[bot.id] === channel.id ? "selected" : ""
                                  }`}
                                  key={channel.id}
                                  onClick={() =>
                                    setSelectedChannelByBot((current) => ({
                                      ...current,
                                      [bot.id]: channel.id,
                                    }))
                                  }
                                >
                                  <span className="channel-hash">#</span>
                                  <span>{channel.name}</span>
                                  {selectedChannelByBot[bot.id] === channel.id && (
                                    <span className="channel-selected-mark">Selected</span>
                                  )}
                                </button>
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
