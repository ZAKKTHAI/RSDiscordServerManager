use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GuildProfile {
    pub id: String,
    pub name: String,
    pub icon: Option<String>,
    pub owner: bool,
}
