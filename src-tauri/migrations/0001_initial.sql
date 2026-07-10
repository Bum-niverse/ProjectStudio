CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    idea TEXT NOT NULL CHECK (length(trim(idea)) > 0),
    git_repository_path TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE documents (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL CHECK (document_type IN ('prd', 'feature_spec', 'user_flow', 'wireframe')),
    title TEXT NOT NULL CHECK (length(trim(title)) > 0),
    current_revision_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE document_revisions (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    revision_number INTEGER NOT NULL CHECK (revision_number > 0),
    content_markdown TEXT NOT NULL,
    content_json TEXT,
    source TEXT NOT NULL CHECK (source IN ('user', 'development_mode', 'ai')),
    created_at TEXT NOT NULL,
    UNIQUE (document_id, revision_number)
) STRICT;

CREATE UNIQUE INDEX idx_documents_project_type
    ON documents(project_id, document_type);
CREATE INDEX idx_document_revisions_document
    ON document_revisions(document_id, revision_number DESC);

CREATE TRIGGER validate_current_revision_insert
BEFORE INSERT ON documents
WHEN NEW.current_revision_id IS NOT NULL
BEGIN
    SELECT RAISE(ABORT, 'current revision must belong to document')
    WHERE NOT EXISTS (
        SELECT 1 FROM document_revisions
        WHERE id = NEW.current_revision_id AND document_id = NEW.id
    );
END;

CREATE TRIGGER validate_current_revision_update
BEFORE UPDATE OF current_revision_id ON documents
WHEN NEW.current_revision_id IS NOT NULL
BEGIN
    SELECT RAISE(ABORT, 'current revision must belong to document')
    WHERE NOT EXISTS (
        SELECT 1 FROM document_revisions
        WHERE id = NEW.current_revision_id AND document_id = NEW.id
    );
END;

CREATE TABLE change_proposals (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    base_revision_id TEXT NOT NULL REFERENCES document_revisions(id),
    proposed_revision_id TEXT NOT NULL REFERENCES document_revisions(id),
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
    summary TEXT NOT NULL,
    decided_at TEXT,
    rejection_reason TEXT,
    created_at TEXT NOT NULL,
    CHECK (
        (status = 'pending' AND decided_at IS NULL) OR
        (status IN ('accepted', 'rejected') AND decided_at IS NOT NULL)
    )
) STRICT;

CREATE TABLE features (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parent_feature_id TEXT REFERENCES features(id) ON DELETE CASCADE,
    source_document_id TEXT REFERENCES documents(id) ON DELETE SET NULL,
    title TEXT NOT NULL CHECK (length(trim(title)) > 0),
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL CHECK (status IN ('planned', 'ready', 'in_progress', 'blocked', 'done')),
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    role TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
) STRICT;

CREATE INDEX idx_features_project_parent
    ON features(project_id, parent_feature_id, sort_order);

CREATE TABLE acceptance_criteria (
    id TEXT PRIMARY KEY,
    feature_id TEXT NOT NULL REFERENCES features(id) ON DELETE CASCADE,
    description TEXT NOT NULL CHECK (length(trim(description)) > 0),
    is_met INTEGER NOT NULL DEFAULT 0 CHECK (is_met IN (0, 1)),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE development_tasks (
    id TEXT PRIMARY KEY,
    feature_id TEXT NOT NULL REFERENCES features(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (length(trim(title)) > 0),
    status TEXT NOT NULL CHECK (status IN ('todo', 'in_progress', 'blocked', 'done')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE trace_links (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL CHECK (source_type IN ('feature', 'task', 'criterion')),
    source_id TEXT NOT NULL,
    target_type TEXT NOT NULL CHECK (target_type IN ('file', 'branch', 'commit', 'test')),
    target_ref TEXT NOT NULL CHECK (length(trim(target_ref)) > 0),
    metadata_json TEXT,
    created_at TEXT NOT NULL,
    UNIQUE (project_id, source_type, source_id, target_type, target_ref)
) STRICT;

CREATE INDEX idx_trace_links_source
    ON trace_links(project_id, source_type, source_id);

CREATE TABLE comments (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK (target_type IN ('document', 'revision', 'feature', 'task', 'criterion')),
    target_id TEXT NOT NULL,
    body TEXT NOT NULL CHECK (length(trim(body)) > 0),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE activity_log (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (length(trim(action)) > 0),
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    details_json TEXT,
    created_at TEXT NOT NULL
) STRICT;

CREATE INDEX idx_activity_log_project_created
    ON activity_log(project_id, created_at DESC);

