CREATE TABLE wireframe_pages (
    id TEXT NOT NULL,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    source_node_id TEXT NOT NULL,
    title TEXT NOT NULL CHECK(length(trim(title)) > 0),
    snapshot_json TEXT NOT NULL CHECK(json_valid(snapshot_json)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY(project_id, id),
    UNIQUE(project_id, source_node_id)
) STRICT;

CREATE INDEX idx_wireframe_pages_project ON wireframe_pages(project_id, updated_at DESC);
