use tauri::command;

use crate::{
    discord::DiscordClient,
    models::BotProfile,
    security::token_store::TokenStore,
};

#[command]
pub async fn authorize_bot(token: String) -> Result<BotProfile, String> {
    let token = token.trim().to_owned();

    if token.is_empty() {
        return Err("Bot token is empty.".to_string());
    }

    // Validate with Discord BEFORE storing anything.
    let profile = DiscordClient::new()
        .fetch_current_bot(&token)
        .await
        .map_err(|error| error.to_string())?;

    // Store only after successful authentication.
    TokenStore::save(&profile.id, &token)
        .map_err(|error| format!("Authenticated, but failed to save token: {error}"))?;

    Ok(profile)
}

#[command]
pub fn remove_bot_token(bot_id: String) -> Result<(), String> {
    TokenStore::delete(&bot_id).map_err(|error| error.to_string())
}
