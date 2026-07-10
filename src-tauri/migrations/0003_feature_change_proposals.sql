CREATE TABLE feature_change_proposals (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    feature_id TEXT NOT NULL REFERENCES features(id) ON DELETE CASCADE,
    base_updated_at TEXT NOT NULL,
    base_snapshot_json TEXT NOT NULL CHECK (json_valid(base_snapshot_json)),
    proposed_snapshot_json TEXT NOT NULL CHECK (json_valid(proposed_snapshot_json)),
    summary TEXT NOT NULL CHECK (length(trim(summary)) > 0),
    source TEXT NOT NULL CHECK (source IN ('development_ai', 'codex', 'manual')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TEXT NOT NULL,
    decided_at TEXT,
    rejection_reason TEXT,
    CHECK (
        (status = 'pending' AND decided_at IS NULL) OR
        (status IN ('accepted', 'rejected') AND decided_at IS NOT NULL)
    )
) STRICT;

CREATE INDEX idx_feature_change_proposals_project_status
    ON feature_change_proposals(project_id, status, created_at DESC);
