mod commands;
mod discord;
mod models;
mod security;
mod storage;

use discord::gateway::GatewayManager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(GatewayManager::default())
        .invoke_handler(tauri::generate_handler![
            commands::auth::authorize_bot,
            commands::auth::list_bots,
            commands::auth::remove_bot_token,
            commands::guild::connect_bot_gateway,
            commands::guild::list_bot_guilds,
            commands::guild::list_guild_channels,
            commands::guild::create_guild_channel,
            commands::guild::delete_guild_channel,
            commands::guild::send_channel_message,
            commands::guild::list_guild_roles,
            commands::guild::list_guild_members,
            commands::guild::add_member_role,
            commands::guild::remove_member_role,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
