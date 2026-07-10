CREATE TABLE feature_view_positions (
    feature_id TEXT NOT NULL REFERENCES features(id) ON DELETE CASCADE,
    view_mode TEXT NOT NULL CHECK (view_mode IN ('tree', 'mindmap')),
    position_x REAL NOT NULL,
    position_y REAL NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (feature_id, view_mode)
) STRICT;

