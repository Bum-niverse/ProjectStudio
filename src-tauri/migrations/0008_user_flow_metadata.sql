ALTER TABLE user_flow_nodes ADD COLUMN depth INTEGER;
ALTER TABLE user_flow_nodes ADD COLUMN parent_id TEXT;
ALTER TABLE user_flow_nodes ADD COLUMN linked_feature_ids TEXT NOT NULL DEFAULT '[]';
ALTER TABLE user_flow_nodes ADD COLUMN branch_condition TEXT;
