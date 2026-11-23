use keyring::Entry;

const SERVICE_NAME: &str = "com.zakkth.discord-server-manager";

pub struct TokenStore;

impl TokenStore {
    fn entry(bot_id: &str) -> Result<Entry, keyring::Error> {
        Entry::new(SERVICE_NAME, bot_id)
    }

    pub fn save(bot_id: &str, token: &str) -> Result<(), keyring::Error> {
        Self::entry(bot_id)?.set_password(token)
    }

    pub fn load(bot_id: &str) -> Result<String, keyring::Error> {
        Self::entry(bot_id)?.get_password()
    }

    pub fn delete(bot_id: &str) -> Result<(), keyring::Error> {
        match Self::entry(bot_id)?.delete_credential() {
            Ok(()) => Ok(()),
            Err(keyring::Error::NoEntry) => Ok(()),
            Err(error) => Err(error),
        }
    }
}
