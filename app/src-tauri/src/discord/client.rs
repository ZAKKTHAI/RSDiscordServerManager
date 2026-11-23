use reqwest::{header, Client, StatusCode};
use serde::Deserialize;

use crate::models::{BotProfile, ChannelProfile};

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
            .filter(|channel| channel.channel_type == 0 || channel.channel_type == 5)
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
