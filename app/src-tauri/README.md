# Discord Server Manager — Rust backend starter

Tauri 2 backend scaffold for Discord bot authorization.

## Features in this starter

- Validates a Bot Token using `GET /api/v10/users/@me`.
- Saves the token to the operating system credential store only after validation succeeds.
- Returns bot metadata to the frontend; the token is never returned.
- Exposes Tauri commands:
  - `authorize_bot(token)`
  - `remove_bot_token(bot_id)`

## Add to an existing Tauri project

Copy the contents of `src/` into your Tauri project's `src-tauri/src/`, and merge
the dependencies from this `Cargo.toml` into `src-tauri/Cargo.toml`.

Ensure your Tauri app calls `discord_server_manager::run()` from its entry point,
or merge the builder setup and command registrations into your existing `run()`.

## Frontend invocation

```ts
import { invoke } from "@tauri-apps/api/core";

type BotProfile = {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
};

const bot = await invoke<BotProfile>("authorize_bot", {
  token: tokenInput,
});
```

After success, clear the token input from React state. Do not write the token to
localStorage, sessionStorage, logs, or frontend settings.

Remove a stored token:

```ts
await invoke("remove_bot_token", { botId: bot.id });
```

## Build notes

This is a backend starter, not a complete generated Tauri application. It expects
to be integrated into a Tauri 2 app with `tauri.conf.json` and the normal Tauri
build setup.

On Arch/CachyOS, install the Tauri Linux prerequisites and Rust toolchain before
building. The Linux Keyring backend needs a working Secret Service provider
(e.g. GNOME Keyring or another compatible Secret Service implementation).

## Security and behavior

- Never ask users to paste personal Discord user tokens. This app accepts Bot Tokens only.
- Authentication does not start the Discord Gateway.
- This starter does not yet enumerate guilds. Guild discovery should be implemented
  from Gateway `GUILD_CREATE` events after the user explicitly starts the bot.
- Do not log request headers or token values.
# RSDiscordServerManager
# RSDiscordServerManager
