ALTER TABLE features ADD COLUMN color_key TEXT NOT NULL DEFAULT 'cyan'
    CHECK (color_key IN ('cyan', 'violet', 'green', 'amber', 'rose', 'slate'));

ALTER TABLE user_flow_nodes ADD COLUMN color_key TEXT NOT NULL DEFAULT 'violet'
    CHECK (color_key IN ('cyan', 'violet', 'green', 'amber', 'rose', 'slate'));
