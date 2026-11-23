use tauri::{command, State};

use crate::{
    discord::{client::DiscordClient, gateway::GatewayManager},
    models::{ChannelProfile, GuildProfile},
    security::token_store::TokenStore,
};

#[command]
pub fn connect_bot_gateway(
    bot_id: String,
    gateway: State<'_, GatewayManager>,
) -> Result<(), String> {
    let token =
        TokenStore::load(&bot_id).map_err(|error| format!("Failed to load bot token: {error}"))?;

    gateway.connect(bot_id, token)
}

#[command]
pub fn list_bot_guilds(
    bot_id: String,
    gateway: State<'_, GatewayManager>,
) -> Result<Vec<GuildProfile>, String> {
    gateway.list_guilds(&bot_id)
}

#[command]
pub async fn list_guild_channels(
    bot_id: String,
    guild_id: String,
) -> Result<Vec<ChannelProfile>, String> {
    let token =
        TokenStore::load(&bot_id).map_err(|error| format!("Failed to load bot token: {error}"))?;

    DiscordClient::new()
        .fetch_guild_channels(&token, &guild_id)
        .await
        .map_err(|error| error.to_string())
}
#[command]
pub async fn send_channel_message(
    bot_id: String,
    channel_id: String,
    content: String,
) -> Result<(), String> {
    let token =
        TokenStore::load(&bot_id).map_err(|error| format!("Failed to load bot token: {error}"))?;

    DiscordClient::new()
        .send_message(&token, &channel_id, &content)
        .await
        .map_err(|error| error.to_string())
}
