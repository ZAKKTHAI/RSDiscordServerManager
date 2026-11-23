use std::{fs, io::ErrorKind, path::Path};

use crate::models::BotProfile;

const FILE_NAME: &str = "bots.json";

pub struct BotStore;

impl BotStore {
    pub fn list(data_dir: &Path) -> Result<Vec<BotProfile>, String> {
        let path = data_dir.join(FILE_NAME);

        match fs::read_to_string(path) {
            Ok(content) => serde_json::from_str(&content).map_err(|error| error.to_string()),
            Err(error) if error.kind() == ErrorKind::NotFound => Ok(Vec::new()),
            Err(error) => Err(error.to_string()),
        }
    }

    pub fn upsert(data_dir: &Path, profile: &BotProfile) -> Result<(), String> {
        fs::create_dir_all(data_dir).map_err(|error| error.to_string())?;

        let mut bots = Self::list(data_dir)?;

        if let Some(existing) = bots.iter_mut().find(|bot| bot.id == profile.id) {
            *existing = profile.clone();
        } else {
            bots.push(profile.clone());
        }

        let json = serde_json::to_string_pretty(&bots).map_err(|error| error.to_string())?;

        let path = data_dir.join(FILE_NAME);
        let temp_path = data_dir.join("bots.json.tmp");

        fs::write(&temp_path, json).map_err(|error| error.to_string())?;

        fs::rename(temp_path, path).map_err(|error| error.to_string())?;

        Ok(())
    }

    pub fn remove(data_dir: &Path, bot_id: &str) -> Result<(), String> {
        let mut bots = Self::list(data_dir)?;
        bots.retain(|bot| bot.id != bot_id);

        fs::create_dir_all(data_dir).map_err(|error| error.to_string())?;

        let json = serde_json::to_string_pretty(&bots).map_err(|error| error.to_string())?;

        let path = data_dir.join(FILE_NAME);
        let temp_path = data_dir.join("bots.json.tmp");

        fs::write(&temp_path, json).map_err(|error| error.to_string())?;

        fs::rename(temp_path, path).map_err(|error| error.to_string())?;

        Ok(())
    }
}
#[cfg(test)]
mod tests {
    use std::{
        fs,
        time::{SystemTime, UNIX_EPOCH},
    };

    use super::BotStore;
    use crate::models::BotProfile;

    fn test_dir() -> std::path::PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();

        std::env::temp_dir().join(format!(
            "discord-server-manager-test-{}-{unique}",
            std::process::id()
        ))
    }

    fn profile(id: &str, username: &str) -> BotProfile {
        BotProfile {
            id: id.to_string(),
            username: username.to_string(),
            display_name: None,
            avatar: None,
        }
    }

    #[test]
    fn bot_store_crud() {
        let dir = test_dir();

        assert!(BotStore::list(&dir).unwrap().is_empty());

        BotStore::upsert(&dir, &profile("123", "bot-one")).unwrap();

        let bots = BotStore::list(&dir).unwrap();
        assert_eq!(bots.len(), 1);
        assert_eq!(bots[0].username, "bot-one");

        // 同じIDなら追加ではなく更新
        BotStore::upsert(&dir, &profile("123", "bot-updated")).unwrap();

        let bots = BotStore::list(&dir).unwrap();
        assert_eq!(bots.len(), 1);
        assert_eq!(bots[0].username, "bot-updated");

        BotStore::remove(&dir, "123").unwrap();

        assert!(BotStore::list(&dir).unwrap().is_empty());

        fs::remove_dir_all(dir).unwrap();
    }
}
