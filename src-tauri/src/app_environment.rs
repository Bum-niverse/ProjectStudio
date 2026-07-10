use serde::Serialize;
use tauri::{AppHandle, Manager};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppEnvironment {
    version: &'static str,
    data_directory: String,
    database_path: String,
}

#[tauri::command]
pub fn get_app_environment(app: AppHandle) -> Result<AppEnvironment, String> {
    let directory = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    Ok(AppEnvironment {
        version: env!("CARGO_PKG_VERSION"),
        database_path: directory.join("projectstudio.db").display().to_string(),
        data_directory: directory.display().to_string(),
    })
}
