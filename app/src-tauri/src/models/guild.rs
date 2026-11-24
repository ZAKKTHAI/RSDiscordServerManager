use serde::Serialize;
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GuildProfile {
    pub id: String,
    pub name: String,
    pub icon: Option<String>,
    pub owner: bool,

    pub public_updates_channel_id: Option<String>,
    pub rules_channel_id: Option<String>,
    pub afk_channel_id: Option<String>,
    pub system_channel_id: Option<String>,
}
