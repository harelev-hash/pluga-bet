-- Migration v9: Extend melm tables for new item kinds and resap workflow

-- Add request_date to melm_requests (default today)
ALTER TABLE melm_requests ADD COLUMN IF NOT EXISTS request_date DATE DEFAULT CURRENT_DATE;

-- Add created_at to melm_items for ordering
ALTER TABLE melm_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- New item kind column
-- Values: 'equipment' (legacy) | 'wear' | 'missing_soldier' | 'missing_dept' | 'free_text'
ALTER TABLE melm_items ADD COLUMN IF NOT EXISTS item_kind TEXT DEFAULT 'equipment';

-- Soldier reference (for wear, missing_soldier kinds)
ALTER TABLE melm_items ADD COLUMN IF NOT EXISTS soldier_id INTEGER REFERENCES soldiers(id) ON DELETE SET NULL;

-- Specific assignment reference (for wear kind — points to equipment_assignments)
ALTER TABLE melm_items ADD COLUMN IF NOT EXISTS assignment_id INTEGER REFERENCES equipment_assignments(id) ON DELETE SET NULL;

-- Free text equipment description (when type not in catalog)
ALTER TABLE melm_items ADD COLUMN IF NOT EXISTS free_text TEXT;

-- Resap response fields
ALTER TABLE melm_items ADD COLUMN IF NOT EXISTS resap_notes TEXT;
ALTER TABLE melm_items ADD COLUMN IF NOT EXISTS resap_status TEXT DEFAULT 'pending';
-- resap_status values: 'pending' | 'supplied' | 'long_term' | 'rejected'
