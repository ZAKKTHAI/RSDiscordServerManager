use reqwest::{header, Client, StatusCode};
use serde::Deserialize;

use crate::models::{BotProfile, ChannelProfile, MemberProfile, RoleProfile};

const DISCORD_API_BASE: &str = "https://discord.com/api/v10";

#[derive(Debug, thiserror::Error)]
pub enum DiscordAuthError {
    #[error("Invalid bot token (Discord returned 401).")]
    Unauthorized,
    #[error("Discord rejected the request: HTTP {0}.")]
    HttpStatus(StatusCode),
    #[error("Network request failed: {0}")]
    Network(#[from] reqwest::Error),
    #[error("Unexpected Discord response: {0}")]
    InvalidResponse(String),
}

#[derive(Debug, Deserialize)]
struct DiscordUser {
    id: String,
    username: String,
    global_name: Option<String>,
    avatar: Option<String>,
    bot: Option<bool>,
}

#[derive(Debug, Deserialize)]
struct DiscordChannel {
    id: String,
    guild_id: Option<String>,
    name: String,
    #[serde(rename = "type")]
    channel_type: u8,
}

#[derive(Debug, Deserialize)]
struct DiscordRole {
    id: String,
    name: String,
    color: u32,
    hoist: bool,
    mentionable: bool,
    position: i64,
    permissions: String,
    managed: bool,
}

#[derive(Debug, Deserialize)]
struct DiscordMember {
    user: DiscordUser,
    nick: Option<String>,
    avatar: Option<String>,
    roles: Vec<String>,
}

pub struct DiscordClient {
    http: Client,
}

impl DiscordClient {
    pub fn new() -> Self {
        Self {
            http: Client::new(),
        }
    }

    pub async fn fetch_current_bot(&self, token: &str) -> Result<BotProfile, DiscordAuthError> {
        let response = self
            .http
            .get(format!("{DISCORD_API_BASE}/users/@me"))
            .header(header::AUTHORIZATION, format!("Bot {token}"))
            .header(header::USER_AGENT, "DiscordServerManager (desktop, 0.1.0)")
            .send()
            .await?;

        if response.status() == StatusCode::UNAUTHORIZED {
            return Err(DiscordAuthError::Unauthorized);
        }

        if !response.status().is_success() {
            return Err(DiscordAuthError::HttpStatus(response.status()));
        }

        let user: DiscordUser = response
            .json()
            .await
            .map_err(|error| DiscordAuthError::InvalidResponse(error.to_string()))?;

        if user.bot != Some(true) {
            return Err(DiscordAuthError::InvalidResponse(
                "The supplied credential does not identify a bot account.".to_string(),
            ));
        }

        Ok(BotProfile {
            id: user.id,
            username: user.username,
            display_name: user.global_name,
            avatar: user.avatar,
        })
    }

    pub async fn fetch_guild_channels(
        &self,
        token: &str,
        guild_id: &str,
    ) -> Result<Vec<ChannelProfile>, DiscordAuthError> {
        let response = self
            .http
            .get(format!("{DISCORD_API_BASE}/guilds/{guild_id}/channels"))
            .header(header::AUTHORIZATION, format!("Bot {token}"))
            .header(header::USER_AGENT, "DiscordServerManager (desktop, 0.1.0)")
            .send()
            .await?;

        if response.status() == StatusCode::UNAUTHORIZED {
            return Err(DiscordAuthError::Unauthorized);
        }

        if !response.status().is_success() {
            return Err(DiscordAuthError::HttpStatus(response.status()));
        }

        let channels: Vec<DiscordChannel> = response
            .json()
            .await
            .map_err(|error| DiscordAuthError::InvalidResponse(error.to_string()))?;

        let mut result: Vec<ChannelProfile> = channels
            .into_iter()
            // 0 = GuildText, 5 = GuildAnnouncement
            .filter(|channel| matches!(channel.channel_type, 0 | 2 | 4 | 5 | 13 | 15 | 16))
            .filter_map(|channel| {
                Some(ChannelProfile {
                    id: channel.id,
                    guild_id: channel.guild_id?,
                    name: channel.name,
                    channel_type: channel.channel_type,
                })
            })
            .collect();

        result.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

        Ok(result)
    }

    pub async fn fetch_guild_roles(
        &self,
        token: &str,
        guild_id: &str,
    ) -> Result<Vec<RoleProfile>, DiscordAuthError> {
        let response = self
            .http
            .get(format!("{DISCORD_API_BASE}/guilds/{guild_id}/roles"))
            .header(header::AUTHORIZATION, format!("Bot {token}"))
            .header(header::USER_AGENT, "DiscordServerManager (desktop, 0.1.0)")
            .send()
            .await?;

        if response.status() == StatusCode::UNAUTHORIZED {
            return Err(DiscordAuthError::Unauthorized);
        }

        if !response.status().is_success() {
            return Err(DiscordAuthError::HttpStatus(response.status()));
        }

        let roles: Vec<DiscordRole> = response
            .json()
            .await
            .map_err(|error| DiscordAuthError::InvalidResponse(error.to_string()))?;

        let mut result: Vec<RoleProfile> = roles
            .into_iter()
            .map(|role| RoleProfile {
                id: role.id,
                guild_id: guild_id.to_string(),
                name: role.name,
                color: role.color,
                hoist: role.hoist,
                mentionable: role.mentionable,
                position: role.position,
                permissions: role.permissions,
                managed: role.managed,
            })
            .collect();

        result.sort_by(|a, b| b.position.cmp(&a.position));

        Ok(result)
    }

    pub async fn fetch_guild_members(
        &self,
        token: &str,
        guild_id: &str,
    ) -> Result<Vec<MemberProfile>, DiscordAuthError> {
        let response = self
            .http
            .get(format!("{DISCORD_API_BASE}/guilds/{guild_id}/members"))
            .query(&[("limit", "1000")])
            .header(header::AUTHORIZATION, format!("Bot {token}"))
            .header(header::USER_AGENT, "DiscordServerManager (desktop, 0.1.0)")
            .send()
            .await?;

        if response.status() == StatusCode::UNAUTHORIZED {
            return Err(DiscordAuthError::Unauthorized);
        }

        if !response.status().is_success() {
            return Err(DiscordAuthError::HttpStatus(response.status()));
        }

        let members: Vec<DiscordMember> = response
            .json()
            .await
            .map_err(|error| DiscordAuthError::InvalidResponse(error.to_string()))?;

        let mut result: Vec<MemberProfile> = members
            .into_iter()
            .map(|member| MemberProfile {
                id: member.user.id,
                username: member.user.username,
                display_name: member.user.global_name,
                nickname: member.nick,
                avatar: member.avatar.or(member.user.avatar),
                roles: member.roles,
                bot: member.user.bot.unwrap_or(false),
            })
            .collect();

        result.sort_by(|a, b| a.username.to_lowercase().cmp(&b.username.to_lowercase()));

        Ok(result)
    }

    pub async fn add_member_role(
        &self,
        token: &str,
        guild_id: &str,
        user_id: &str,
        role_id: &str,
    ) -> Result<(), DiscordAuthError> {
        let response = self
            .http
            .put(format!(
                "{DISCORD_API_BASE}/guilds/{guild_id}/members/{user_id}/roles/{role_id}"
            ))
            .header(header::AUTHORIZATION, format!("Bot {token}"))
            .header(header::USER_AGENT, "DiscordServerManager (desktop, 0.1.0)")
            .send()
            .await?;

        if response.status() == StatusCode::UNAUTHORIZED {
            return Err(DiscordAuthError::Unauthorized);
        }

        if !response.status().is_success() {
            return Err(DiscordAuthError::HttpStatus(response.status()));
        }

        Ok(())
    }

    pub async fn remove_member_role(
        &self,
        token: &str,
        guild_id: &str,
        user_id: &str,
        role_id: &str,
    ) -> Result<(), DiscordAuthError> {
        let response = self
            .http
            .delete(format!(
                "{DISCORD_API_BASE}/guilds/{guild_id}/members/{user_id}/roles/{role_id}"
            ))
            .header(header::AUTHORIZATION, format!("Bot {token}"))
            .header(header::USER_AGENT, "DiscordServerManager (desktop, 0.1.0)")
            .send()
            .await?;

        if response.status() == StatusCode::UNAUTHORIZED {
            return Err(DiscordAuthError::Unauthorized);
        }

        if !response.status().is_success() {
            return Err(DiscordAuthError::HttpStatus(response.status()));
        }

        Ok(())
    }

    pub async fn create_guild_channel(
        &self,
        token: &str,
        guild_id: &str,
        name: &str,
        channel_type: u8,
        parent_id: Option<&str>,
        topic: Option<&str>,
    ) -> Result<(), DiscordAuthError> {
        let name = name.trim();

        if name.is_empty() {
            return Err(DiscordAuthError::InvalidResponse(
                "Channel name cannot be empty.".to_string(),
            ));
        }

        if !matches!(channel_type, 0 | 2 | 4) {
            return Err(DiscordAuthError::InvalidResponse(
                "Unsupported channel type.".to_string(),
            ));
        }

        let response = self
            .http
            .post(format!("{DISCORD_API_BASE}/guilds/{guild_id}/channels"))
            .header(header::AUTHORIZATION, format!("Bot {token}"))
            .header(header::USER_AGENT, "DiscordServerManager (desktop, 0.1.0)")
            .json(&serde_json::json!({
                "name": name,
                "type": channel_type,
                "parent_id": parent_id,
                "topic": topic,
            }))
            .send()
            .await?;

        if response.status() == StatusCode::UNAUTHORIZED {
            return Err(DiscordAuthError::Unauthorized);
        }

        if !response.status().is_success() {
            return Err(DiscordAuthError::HttpStatus(response.status()));
        }

        Ok(())
    }

    pub async fn edit_guild_channel(
        &self,
        token: &str,
        channel_id: &str,
        name: &str,
    ) -> Result<(), DiscordAuthError> {
        let name = name.trim();

        if name.is_empty() {
            return Err(DiscordAuthError::InvalidResponse(
                "Channel name cannot be empty.".to_string(),
            ));
        }

        let response = self
            .http
            .patch(format!("{DISCORD_API_BASE}/channels/{channel_id}"))
            .header(header::AUTHORIZATION, format!("Bot {token}"))
            .header(header::USER_AGENT, "DiscordServerManager (desktop, 0.1.0)")
            .json(&serde_json::json!({
                "name": name,
            }))
            .send()
            .await?;

        if response.status() == StatusCode::UNAUTHORIZED {
            return Err(DiscordAuthError::Unauthorized);
        }

        if !response.status().is_success() {
            return Err(DiscordAuthError::HttpStatus(response.status()));
        }

        Ok(())
    }

    pub async fn delete_guild_channel(
        &self,
        token: &str,
        channel_id: &str,
    ) -> Result<(), DiscordAuthError> {
        let response = self
            .http
            .delete(format!("{DISCORD_API_BASE}/channels/{channel_id}"))
            .header(header::AUTHORIZATION, format!("Bot {token}"))
            .header(header::USER_AGENT, "DiscordServerManager (desktop, 0.1.0)")
            .send()
            .await?;

        if response.status() == StatusCode::UNAUTHORIZED {
            return Err(DiscordAuthError::Unauthorized);
        }

        if !response.status().is_success() {
            return Err(DiscordAuthError::HttpStatus(response.status()));
        }

        Ok(())
    }

    pub async fn send_message(
        &self,
        token: &str,
        channel_id: &str,
        content: &str,
    ) -> Result<(), DiscordAuthError> {
        let content = content.trim();

        if content.is_empty() {
            return Err(DiscordAuthError::InvalidResponse(
                "Message cannot be empty.".to_string(),
            ));
        }

        if content.chars().count() > 2000 {
            return Err(DiscordAuthError::InvalidResponse(
                "Message exceeds Discord's 2000 character limit.".to_string(),
            ));
        }

        let response = self
            .http
            .post(format!("{DISCORD_API_BASE}/channels/{channel_id}/messages"))
            .header(header::AUTHORIZATION, format!("Bot {token}"))
            .header(header::USER_AGENT, "DiscordServerManager (desktop, 0.1.0)")
            .json(&serde_json::json!({
                "content": content
            }))
            .send()
            .await?;

        if response.status() == StatusCode::UNAUTHORIZED {
            return Err(DiscordAuthError::Unauthorized);
        }

        if !response.status().is_success() {
            return Err(DiscordAuthError::HttpStatus(response.status()));
        }

        Ok(())
    }
}
