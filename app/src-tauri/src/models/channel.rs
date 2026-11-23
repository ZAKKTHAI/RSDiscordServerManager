use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChannelProfile {
    pub id: String,
    pub guild_id: String,
    pub name: String,
    pub channel_type: u8,
}
