mod codex_sync;
mod codex_wireframe;
mod developer_tools;
mod feature_change_proposals;
mod feature_repository;
mod github_auth;
mod project_export;
mod project_repository;
mod user_flow_repository;

use tauri_plugin_sql::{Migration, MigrationKind};

const DATABASE_URL: &str = "sqlite:projectstudio.db";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "initial_projectstudio_schema",
            sql: include_str!("../migrations/0001_initial.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "feature_view_positions",
            sql: include_str!("../migrations/0002_feature_view_positions.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "feature_change_proposals",
            sql: include_str!("../migrations/0003_feature_change_proposals.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "user_flows",
            sql: include_str!("../migrations/0004_user_flows.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "node_crud_and_colors",
            sql: include_str!("../migrations/0005_node_crud_and_colors.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            project_repository::save_project_with_initial_prd,
            project_repository::list_projects,
            project_repository::save_prd_revision,
            project_export::export_project_package,
            feature_repository::initialize_feature_spec,
            feature_repository::save_feature_position,
            feature_repository::list_feature_positions,
            feature_repository::update_feature,
            feature_repository::reparent_feature,
            feature_repository::create_feature,
            feature_repository::delete_feature,
            feature_change_proposals::create_feature_change_proposal,
            feature_change_proposals::list_feature_change_proposals,
            feature_change_proposals::decide_feature_change_proposal,
            developer_tools::check_developer_tools,
            developer_tools::check_tool_connection,
            github_auth::get_github_session,
            github_auth::start_github_login,
            codex_sync::sync_project_documents,
            codex_wireframe::generate_wireframes_with_codex,
            user_flow_repository::initialize_user_flow,
            user_flow_repository::update_user_flow_node,
            user_flow_repository::connect_user_flow_nodes,
            user_flow_repository::create_user_flow_node,
            user_flow_repository::delete_user_flow_node
        ])
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(DATABASE_URL, migrations)
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("ProjectStudio 실행 중 복구할 수 없는 오류가 발생했습니다.");
}
