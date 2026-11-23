use tauri::{command, AppHandle, Manager};

use crate::{
    discord::DiscordClient, models::BotProfile, security::token_store::TokenStore,
    storage::bot_store::BotStore,
};

#[command]
pub async fn authorize_bot(app: AppHandle, token: String) -> Result<BotProfile, String> {
    let token = token.trim().to_owned();

    if token.is_empty() {
        return Err("Bot token is empty.".to_string());
    }

    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;

    let profile = DiscordClient::new()
        .fetch_current_bot(&token)
        .await
        .map_err(|error| error.to_string())?;

    TokenStore::save(&profile.id, &token)
        .map_err(|error| format!("Failed to save bot token: {error}"))?;

    if let Err(error) = BotStore::upsert(&data_dir, &profile) {
        let _ = TokenStore::delete(&profile.id);

        return Err(format!(
            "Failed to save bot profile. Token storage was rolled back: {error}"
        ));
    }

    Ok(profile)
}

#[command]
pub fn list_bots(app: AppHandle) -> Result<Vec<BotProfile>, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;

    BotStore::list(&data_dir)
}

#[command]
pub fn remove_bot_token(app: AppHandle, bot_id: String) -> Result<(), String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;

    TokenStore::delete(&bot_id).map_err(|error| format!("Failed to delete bot token: {error}"))?;

    BotStore::remove(&data_dir, &bot_id)
}
