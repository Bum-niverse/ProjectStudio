mod project_repository;

use tauri_plugin_sql::{Migration, MigrationKind};

const DATABASE_URL: &str = "sqlite:projectstudio.db";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![Migration {
        version: 1,
        description: "initial_projectstudio_schema",
        sql: include_str!("../migrations/0001_initial.sql"),
        kind: MigrationKind::Up,
    }];

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            project_repository::save_project_with_initial_prd,
            project_repository::list_projects,
            project_repository::save_prd_revision
        ])
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(DATABASE_URL, migrations)
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("ProjectStudio 실행 중 복구할 수 없는 오류가 발생했습니다.");
}
