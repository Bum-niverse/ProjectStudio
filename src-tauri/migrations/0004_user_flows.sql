CREATE TABLE user_flow_nodes (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    lane_id TEXT NOT NULL,
    title TEXT NOT NULL CHECK (length(trim(title)) > 0),
    description TEXT NOT NULL DEFAULT '',
    kind TEXT NOT NULL CHECK (kind IN ('phase', 'screen', 'action', 'result', 'decision')),
    position_x REAL NOT NULL,
    position_y REAL NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
) STRICT;

CREATE INDEX idx_user_flow_nodes_project ON user_flow_nodes(project_id);

CREATE TABLE user_flow_edges (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    source_node_id TEXT NOT NULL REFERENCES user_flow_nodes(id) ON DELETE CASCADE,
    target_node_id TEXT NOT NULL REFERENCES user_flow_nodes(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    UNIQUE(project_id, source_node_id, target_node_id),
    CHECK(source_node_id <> target_node_id)
) STRICT;
