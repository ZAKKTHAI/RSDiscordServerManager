use reqwest::{header, Client, StatusCode};
use serde::Deserialize;

use crate::models::BotProfile;

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

pub struct DiscordClient {
    http: Client,
}

impl DiscordClient {
    pub fn new() -> Self {
        Self {
            http: Client::new(),
        }
    }

    pub async fn fetch_current_bot(
        &self,
        token: &str,
    ) -> Result<BotProfile, DiscordAuthError> {
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

        if user.bot == Some(false) {
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
}
