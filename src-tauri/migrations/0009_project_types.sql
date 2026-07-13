ALTER TABLE projects ADD COLUMN project_type TEXT NOT NULL DEFAULT 'auto'
CHECK (project_type IN ('auto', 'web', 'mobile', 'desktop', 'backend_cli', 'machine_learning', 'data_analysis', 'general'));
