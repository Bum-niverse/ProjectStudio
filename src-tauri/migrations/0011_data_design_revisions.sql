CREATE TABLE data_designs (
  project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  current_revision_id TEXT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE data_design_revisions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES data_designs(project_id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL,
  content_json TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('user', 'rule', 'ai')),
  created_at TEXT NOT NULL,
  UNIQUE(project_id, revision_number)
);

CREATE INDEX idx_data_design_revisions_project ON data_design_revisions(project_id, revision_number DESC);
