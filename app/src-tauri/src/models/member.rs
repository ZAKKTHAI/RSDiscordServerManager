use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MemberProfile {
    pub id: String,
    pub username: String,
    pub display_name: Option<String>,
    pub nickname: Option<String>,
    pub avatar: Option<String>,
    pub roles: Vec<String>,
    pub bot: bool,
}
