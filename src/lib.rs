mod commands;
mod discord;
mod models;
mod security;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::authorize_bot,
            commands::remove_bot_token,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}
