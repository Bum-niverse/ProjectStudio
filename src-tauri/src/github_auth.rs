use serde::Serialize;
use std::process::Command;

const OWNER_GITHUB_ID: u64 = 128_395_576;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GithubUser {
    id: u64,
    login: String,
    name: Option<String>,
    avatar_url: String,
    is_owner: bool,
}

#[tauri::command]
pub async fn get_github_session() -> Result<GithubUser, String> {
    let auth = Command::new("gh")
        .args(["auth", "status", "--hostname", "github.com"])
        .output()
        .map_err(|_| {
            "GitHub CLI를 찾지 못했습니다. 설정에서 GitHub CLI 상태를 확인해 주세요.".to_owned()
        })?;
    if !auth.status.success() {
        return Err("GitHub 인증이 필요합니다. GitHub 로그인을 시작해 주세요.".to_owned());
    }
    let output = Command::new("gh")
        .args(["api", "user"])
        .output()
        .map_err(|e| format!("GitHub 사용자 정보를 확인하지 못했습니다: {e}"))?;
    if !output.status.success() {
        return Err("GitHub 사용자 정보를 확인하지 못했습니다.".to_owned());
    }
    let value: serde_json::Value = serde_json::from_slice(&output.stdout)
        .map_err(|e| format!("GitHub 응답을 읽지 못했습니다: {e}"))?;
    let id = value["id"]
        .as_u64()
        .ok_or_else(|| "GitHub 사용자 ID가 없습니다.".to_owned())?;
    let login = value["login"].as_str().unwrap_or_default().to_owned();
    if id != OWNER_GITHUB_ID {
        return Err(format!(
            "{login} 계정은 이 개인 작업대에 접근할 수 없습니다."
        ));
    }
    Ok(GithubUser {
        id,
        login,
        name: value["name"].as_str().map(str::to_owned),
        avatar_url: value["avatar_url"].as_str().unwrap_or_default().to_owned(),
        is_owner: true,
    })
}

#[tauri::command]
pub async fn start_github_login() -> Result<(), String> {
    let script="Start-Process -FilePath 'gh' -ArgumentList @('auth','login','--hostname','github.com','--web','--git-protocol','https')";
    Command::new("powershell")
        .args(["-NoProfile", "-Command", script])
        .spawn()
        .map_err(|e| format!("GitHub 로그인 창을 열지 못했습니다: {e}"))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::OWNER_GITHUB_ID;
    #[test]
    fn owner_id_is_stable() {
        assert_eq!(OWNER_GITHUB_ID, 128_395_576);
    }
}
