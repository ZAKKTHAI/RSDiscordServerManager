use tauri::{command, State};

use crate::{
    discord::{client::DiscordClient, gateway::GatewayManager},
    models::{ChannelProfile, GuildProfile, MemberProfile, RoleProfile},
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
pub async fn create_guild_channel(
    bot_id: String,
    guild_id: String,
    name: String,
    channel_type: u8,
    parent_id: Option<String>,
    topic: Option<String>,
) -> Result<(), String> {
    let token =
        TokenStore::load(&bot_id).map_err(|error| format!("Failed to load bot token: {error}"))?;

    DiscordClient::new()
        .create_guild_channel(
            &token,
            &guild_id,
            &name,
            channel_type,
            parent_id.as_deref(),
            topic.as_deref(),
        )
        .await
        .map_err(|error| error.to_string())
}

#[command]
pub async fn delete_guild_channel(bot_id: String, channel_id: String) -> Result<(), String> {
    let token =
        TokenStore::load(&bot_id).map_err(|error| format!("Failed to load bot token: {error}"))?;

    DiscordClient::new()
        .delete_guild_channel(&token, &channel_id)
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

#[command]
pub async fn list_guild_roles(
    bot_id: String,
    guild_id: String,
) -> Result<Vec<RoleProfile>, String> {
    let token =
        TokenStore::load(&bot_id).map_err(|error| format!("Failed to load bot token: {error}"))?;

    DiscordClient::new()
        .fetch_guild_roles(&token, &guild_id)
        .await
        .map_err(|error| error.to_string())
}

#[command]
pub async fn list_guild_members(
    bot_id: String,
    guild_id: String,
) -> Result<Vec<MemberProfile>, String> {
    let token =
        TokenStore::load(&bot_id).map_err(|error| format!("Failed to load bot token: {error}"))?;

    DiscordClient::new()
        .fetch_guild_members(&token, &guild_id)
        .await
        .map_err(|error| error.to_string())
}

#[command]
pub async fn add_member_role(
    bot_id: String,
    guild_id: String,
    user_id: String,
    role_id: String,
) -> Result<(), String> {
    let token =
        TokenStore::load(&bot_id).map_err(|error| format!("Failed to load bot token: {error}"))?;

    DiscordClient::new()
        .add_member_role(&token, &guild_id, &user_id, &role_id)
        .await
        .map_err(|error| error.to_string())
}

#[command]
pub async fn remove_member_role(
    bot_id: String,
    guild_id: String,
    user_id: String,
    role_id: String,
) -> Result<(), String> {
    let token =
        TokenStore::load(&bot_id).map_err(|error| format!("Failed to load bot token: {error}"))?;

    DiscordClient::new()
        .remove_member_role(&token, &guild_id, &user_id, &role_id)
        .await
        .map_err(|error| error.to_string())
}
