use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
};

use tauri::async_runtime::{self, JoinHandle};
use twilight_gateway::{Event, EventTypeFlags, Intents, Shard, ShardId, StreamExt as _};
use twilight_model::gateway::payload::incoming::GuildCreate;

use crate::models::GuildProfile;

type GuildMap = Arc<Mutex<HashMap<String, GuildProfile>>>;

struct GatewaySession {
    guilds: GuildMap,
    task: JoinHandle<()>,
}

#[derive(Default)]
pub struct GatewayManager {
    sessions: Mutex<HashMap<String, GatewaySession>>,
}

impl GatewayManager {
    pub fn connect(&self, bot_id: String, token: String) -> Result<(), String> {
        let mut sessions = self
            .sessions
            .lock()
            .map_err(|_| "Gateway manager lock poisoned".to_string())?;

        if sessions.contains_key(&bot_id) {
            return Ok(());
        }

        let guilds = Arc::new(Mutex::new(HashMap::new()));
        let task_guilds = guilds.clone();

        let task = async_runtime::spawn(async move {
            let mut shard = Shard::new(ShardId::ONE, token, Intents::GUILDS);

            while let Some(item) = shard.next_event(EventTypeFlags::all()).await {
                match item {
                    Ok(Event::GuildCreate(event)) => {
                        if let GuildCreate::Available(guild) = *event {
                            let profile = GuildProfile {
                                id: guild.id.to_string(),
                                name: guild.name,
                                icon: guild.icon.map(|icon| icon.to_string()),
                                owner: guild.owner.unwrap_or(false),
                                public_updates_channel_id: guild
                                    .public_updates_channel_id
                                    .map(|id| id.to_string()),
                                rules_channel_id: guild.rules_channel_id.map(|id| id.to_string()),
                                afk_channel_id: guild.afk_channel_id.map(|id| id.to_string()),
                                system_channel_id: guild.system_channel_id.map(|id| id.to_string()),
                            };

                            if let Ok(mut cache) = task_guilds.lock() {
                                cache.insert(profile.id.clone(), profile);
                            }
                        }
                    }
                    Ok(Event::GuildDelete(event)) => {
                        if event.unavailable != Some(true) {
                            if let Ok(mut cache) = task_guilds.lock() {
                                cache.remove(&event.id.to_string());
                            }
                        }
                    }
                    _ => {}
                }
            }
        });

        sessions.insert(bot_id, GatewaySession { guilds, task });

        Ok(())
    }

    pub fn disconnect(&self, bot_id: &str) -> Result<(), String> {
        let mut sessions = self
            .sessions
            .lock()
            .map_err(|_| "Gateway manager lock poisoned".to_string())?;

        if let Some(session) = sessions.remove(bot_id) {
            session.task.abort();
        }

        Ok(())
    }

    pub fn list_guilds(&self, bot_id: &str) -> Result<Vec<GuildProfile>, String> {
        let sessions = self
            .sessions
            .lock()
            .map_err(|_| "Gateway manager lock poisoned".to_string())?;

        let Some(session) = sessions.get(bot_id) else {
            return Ok(Vec::new());
        };

        let cache = session
            .guilds
            .lock()
            .map_err(|_| "Guild cache lock poisoned".to_string())?;

        let mut result: Vec<GuildProfile> = cache.values().cloned().collect();

        result.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

        Ok(result)
    }
}
