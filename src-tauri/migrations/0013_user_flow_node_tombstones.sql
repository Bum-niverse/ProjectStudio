CREATE TABLE IF NOT EXISTS user_flow_node_tombstones (
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    node_id TEXT NOT NULL,
    deleted_at TEXT NOT NULL,
    PRIMARY KEY (project_id, node_id)
);
