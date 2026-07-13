use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Component, Path, PathBuf},
};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DriftNodeInput {
    node_id: String,
    code_paths: Vec<String>,
    test_paths: Vec<String>,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DriftInput {
    repository_path: String,
    nodes: Vec<DriftNodeInput>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DriftItem {
    node_id: String,
    status: String,
    existing_code_paths: Vec<String>,
    missing_code_paths: Vec<String>,
    existing_test_paths: Vec<String>,
    missing_test_paths: Vec<String>,
    semantic_evidence: Vec<String>,
    message: String,
}

fn semantic_evidence(root: &Path, values: &[String]) -> Vec<String> {
    let mut evidence = Vec::new();
    for value in values.iter().filter(|value| !value.contains('*')).take(20) {
        let Some(relative) = safe_relative(value) else {
            continue;
        };
        let Ok(path) = fs::canonicalize(root.join(relative)) else {
            continue;
        };
        if !path.starts_with(root) {
            continue;
        }
        let Ok(metadata) = fs::metadata(&path) else {
            continue;
        };
        if !metadata.is_file() || metadata.len() > 1_000_000 {
            continue;
        }
        let Ok(source) = fs::read_to_string(path) else {
            continue;
        };
        for (index, line) in source.lines().enumerate() {
            let trimmed = line.trim();
            if trimmed.starts_with("import ")
                || trimmed.starts_with("export ") && trimmed.contains(" from ")
                || trimmed.starts_with("use crate::")
                || trimmed.contains("require(")
            {
                evidence.push(format!(
                    "{}:{} {}",
                    value,
                    index + 1,
                    trimmed.chars().take(180).collect::<String>()
                ));
                if evidence.len() >= 100 {
                    return evidence;
                }
            }
        }
    }
    evidence
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DriftReport {
    repository_path: String,
    checked_at: String,
    items: Vec<DriftItem>,
}

fn safe_relative(value: &str) -> Option<PathBuf> {
    let path = Path::new(value);
    if value.trim().is_empty()
        || path.is_absolute()
        || path
            .components()
            .any(|part| matches!(part, Component::ParentDir | Component::Prefix(_)))
    {
        None
    } else {
        Some(path.to_path_buf())
    }
}
fn has_matching_descendant(path: &Path, suffix: &str, visited: &mut usize) -> bool {
    if *visited > 20_000 {
        return false;
    }
    let entries = match fs::read_dir(path) {
        Ok(entries) => entries,
        Err(_) => return false,
    };
    for entry in entries.flatten() {
        *visited += 1;
        let child = entry.path();
        if child.is_dir() {
            if has_matching_descendant(&child, suffix, visited) {
                return true;
            }
        } else if child.to_string_lossy().replace('\\', "/").ends_with(suffix) {
            return true;
        }
    }
    false
}
fn linked_path_exists(root: &Path, value: &str, relative: &Path) -> bool {
    if !value.contains('*') {
        return root.join(relative).exists();
    }
    let normalized = value.replace('\\', "/");
    let prefix = normalized
        .split('*')
        .next()
        .unwrap_or("")
        .trim_end_matches('/');
    let suffix = normalized
        .rsplit('*')
        .next()
        .unwrap_or("")
        .trim_start_matches('/');
    let start = root.join(prefix);
    start.exists() && has_matching_descendant(&start, suffix, &mut 0)
}
fn inspect_paths(root: &Path, values: &[String]) -> Result<(Vec<String>, Vec<String>), String> {
    let mut existing = Vec::new();
    let mut missing = Vec::new();
    for value in values {
        let relative = safe_relative(value)
            .ok_or_else(|| format!("안전하지 않은 저장소 상대 경로입니다: {value}"))?;
        if linked_path_exists(root, value, &relative) {
            existing.push(value.clone())
        } else {
            missing.push(value.clone())
        }
    }
    Ok((existing, missing))
}

#[tauri::command]
pub async fn inspect_architecture_drift(input: DriftInput) -> Result<DriftReport, String> {
    if input.nodes.len() > 200 {
        return Err("한 번에 검사할 수 있는 시스템 노드는 200개입니다.".into());
    }
    let root = fs::canonicalize(input.repository_path.trim())
        .map_err(|_| "연결된 저장소 경로를 찾지 못했습니다.".to_owned())?;
    if !root.join(".git").is_dir() {
        return Err("Git 저장소 루트만 검사할 수 있습니다.".into());
    }
    let mut items = Vec::new();
    for node in input.nodes {
        if node.node_id.trim().is_empty()
            || node.code_paths.len() > 50
            || node.test_paths.len() > 50
        {
            return Err("노드 ID 또는 연결 경로 수를 확인해 주세요.".into());
        }
        let (existing_code, missing_code) = inspect_paths(&root, &node.code_paths)?;
        let (existing_test, missing_test) = inspect_paths(&root, &node.test_paths)?;
        let evidence = semantic_evidence(&root, &existing_code);
        let status = if node.code_paths.is_empty() && node.test_paths.is_empty() {
            "unlinked"
        } else if missing_code.is_empty() && missing_test.is_empty() {
            "verified"
        } else {
            "missing"
        };
        let message = match status {
            "verified" => "연결된 코드와 테스트 경로가 모두 존재합니다.",
            "unlinked" => "코드·테스트 경로가 연결되지 않았습니다.",
            _ => "설계에 연결된 경로 일부를 저장소에서 찾지 못했습니다.",
        };
        items.push(DriftItem {
            node_id: node.node_id,
            status: status.into(),
            existing_code_paths: existing_code,
            missing_code_paths: missing_code,
            existing_test_paths: existing_test,
            missing_test_paths: missing_test,
            semantic_evidence: evidence,
            message: message.into(),
        });
    }
    Ok(DriftReport {
        repository_path: root.to_string_lossy().into_owned(),
        checked_at: chrono_free_timestamp(),
        items,
    })
}

fn chrono_free_timestamp() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|value| value.as_secs().to_string())
        .unwrap_or_else(|_| "0".into())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rejects_parent_and_absolute_paths() {
        assert!(safe_relative("../secret").is_none());
        assert!(safe_relative("C:\\secret").is_none());
        assert!(safe_relative("src/main.rs").is_some());
    }
    #[test]
    fn resolves_limited_recursive_glob() {
        let root = std::env::temp_dir().join(format!("projectstudio-drift-{}", std::process::id()));
        let nested = root.join("src/domain");
        fs::create_dir_all(&nested).expect("temp tree");
        fs::write(nested.join("model.test.ts"), "test").expect("temp test");
        let pattern = "src/**/*.test.ts";
        assert!(linked_path_exists(&root, pattern, Path::new(pattern)));
        let _ = fs::remove_dir_all(root);
    }
}
