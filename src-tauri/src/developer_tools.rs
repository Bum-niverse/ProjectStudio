use serde::Serialize;
use std::process::Command;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolStatus {
    is_installed: bool,
    version: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeveloperToolsStatus {
    codex: ToolStatus,
    git: ToolStatus,
    github_cli: ToolStatus,
    is_github_authenticated: bool,
}

fn version_status(program: &str, args: &[&str]) -> ToolStatus {
    match Command::new(program).args(args).output() {
        Ok(output) if output.status.success() => {
            let text = String::from_utf8_lossy(&output.stdout);
            ToolStatus {
                is_installed: true,
                version: text.lines().next().map(str::trim).map(str::to_owned),
            }
        }
        _ => ToolStatus {
            is_installed: false,
            version: None,
        },
    }
}

#[tauri::command]
pub async fn check_developer_tools() -> DeveloperToolsStatus {
    let codex = version_status("codex", &["--version"]);
    let git = version_status("git", &["--version"]);
    let github_cli = version_status("gh", &["--version"]);
    let is_github_authenticated = github_cli.is_installed
        && Command::new("gh")
            .args(["auth", "status"])
            .output()
            .is_ok_and(|output| output.status.success());

    DeveloperToolsStatus {
        codex,
        git,
        github_cli,
        is_github_authenticated,
    }
}
