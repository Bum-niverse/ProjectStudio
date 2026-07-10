use serde::{Deserialize, Serialize};
use std::{env, fs, path::PathBuf, process::Command};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolStatus {
    is_installed: bool,
    version: Option<String>,
    program_path: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeveloperToolsStatus {
    claude: ToolStatus,
    codex: ToolStatus,
    antigravity: ToolStatus,
    local_llm: ToolStatus,
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
                program_path: Some(program.to_owned()),
            }
        }
        _ => ToolStatus {
            is_installed: false,
            version: None,
            program_path: None,
        },
    }
}

fn codex_status() -> ToolStatus {
    let direct = version_status("codex", &["--version"]);
    if direct.is_installed {
        return direct;
    }
    let Some(local_app_data) = env::var_os("LOCALAPPDATA") else {
        return direct;
    };
    let bin_root = PathBuf::from(local_app_data).join("OpenAI/Codex/bin");
    let Ok(entries) = fs::read_dir(bin_root) else {
        return direct;
    };
    for executable in entries
        .flatten()
        .map(|entry| entry.path().join("codex.exe"))
    {
        if executable.is_file() {
            let status = version_status(&executable.to_string_lossy(), &["--version"]);
            if status.is_installed {
                return status;
            }
        }
    }
    direct
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckToolConnectionInput {
    program_path: String,
}

#[tauri::command]
pub async fn check_tool_connection(input: CheckToolConnectionInput) -> Result<ToolStatus, String> {
    let program_path = input.program_path.trim();
    if program_path.is_empty() || program_path.len() > 500 {
        return Err("실행 파일 경로를 확인해 주세요.".to_owned());
    }
    let status = version_status(program_path, &["--version"]);
    if status.is_installed {
        Ok(status)
    } else {
        Err("해당 경로에서 실행 가능한 도구를 찾지 못했습니다.".to_owned())
    }
}

#[tauri::command]
pub async fn check_developer_tools() -> DeveloperToolsStatus {
    let claude = version_status("claude", &["--version"]);
    let codex = codex_status();
    let antigravity = version_status("antigravity", &["--version"]);
    let local_llm = version_status("ollama", &["--version"]);
    let git = version_status("git", &["--version"]);
    let github_cli = version_status("gh", &["--version"]);
    let is_github_authenticated = github_cli.is_installed
        && Command::new("gh")
            .args(["auth", "status"])
            .output()
            .is_ok_and(|output| output.status.success());

    DeveloperToolsStatus {
        claude,
        codex,
        antigravity,
        local_llm,
        git,
        github_cli,
        is_github_authenticated,
    }
}
