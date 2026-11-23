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
#[cfg(test)]
mod tests {
    use super::TokenStore;

    #[test]
    fn keyring_round_trip() {
        let bot_id = "discord-server-manager-smoke-test";
        let dummy_token = "not-a-real-discord-token";

        TokenStore::save(bot_id, dummy_token).expect("Failed to save test credential");

        let loaded = TokenStore::load(bot_id).expect("Failed to load test credential");

        assert_eq!(loaded, dummy_token);

        TokenStore::delete(bot_id).expect("Failed to delete test credential");
    }
}
