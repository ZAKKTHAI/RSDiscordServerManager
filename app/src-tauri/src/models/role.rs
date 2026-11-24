use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RoleProfile {
    pub id: String,
    pub guild_id: String,
    pub name: String,
    pub color: u32,
    pub hoist: bool,
    pub mentionable: bool,
    pub position: i64,
    pub permissions: String,
    pub managed: bool,
}
