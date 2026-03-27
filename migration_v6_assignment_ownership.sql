-- =============================================
-- Migration v6: Add ownership to equipment_assignments
-- Run in Supabase SQL Editor
-- =============================================

ALTER TABLE equipment_assignments
  ADD COLUMN IF NOT EXISTS ownership TEXT NOT NULL DEFAULT 'platoon'
    CHECK (ownership IN ('personal', 'platoon', 'battalion'));

-- Backfill from the linked equipment_type (via item or direct type_id)
UPDATE equipment_assignments ea
SET ownership = COALESCE(
  (SELECT et.ownership FROM equipment_items ei JOIN equipment_types et ON et.id = ei.type_id WHERE ei.id = ea.item_id),
  (SELECT et.ownership FROM equipment_types et WHERE et.id = ea.type_id),
  'platoon'
)
WHERE ownership = 'platoon';
