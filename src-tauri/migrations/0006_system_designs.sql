CREATE TABLE system_designs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK(length(trim(title)) > 0),
    current_revision_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE system_design_revisions (
    id TEXT PRIMARY KEY,
    design_id TEXT NOT NULL REFERENCES system_designs(id) ON DELETE CASCADE,
    revision_number INTEGER NOT NULL CHECK(revision_number > 0),
    snapshot_json TEXT NOT NULL CHECK(json_valid(snapshot_json)),
    source TEXT NOT NULL CHECK(source IN ('user', 'development_mode', 'codex')),
    created_at TEXT NOT NULL,
    UNIQUE(design_id, revision_number)
) STRICT;

CREATE INDEX idx_system_design_revisions_design ON system_design_revisions(design_id, revision_number DESC);

CREATE TABLE system_design_proposals (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    design_id TEXT NOT NULL REFERENCES system_designs(id) ON DELETE CASCADE,
    base_revision_id TEXT NOT NULL REFERENCES system_design_revisions(id),
    proposed_snapshot_json TEXT NOT NULL CHECK(json_valid(proposed_snapshot_json)),
    summary TEXT NOT NULL CHECK(length(trim(summary)) > 0),
    source TEXT NOT NULL CHECK(source = 'codex'),
    status TEXT NOT NULL CHECK(status IN ('pending', 'accepted', 'rejected')),
    created_at TEXT NOT NULL,
    decided_at TEXT,
    rejection_reason TEXT,
    CHECK((status = 'pending' AND decided_at IS NULL) OR (status IN ('accepted', 'rejected') AND decided_at IS NOT NULL))
) STRICT;

CREATE INDEX idx_system_design_proposals_project_status ON system_design_proposals(project_id, status, created_at DESC);
