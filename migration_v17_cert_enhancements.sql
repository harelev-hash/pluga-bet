-- migration_v17_cert_enhancements.sql
-- 1. Link a certification type to a duty position (optional, for display purposes)
-- 2. Helper function to rename a certification across all soldiers atomically

ALTER TABLE certification_types
  ADD COLUMN IF NOT EXISTS linked_position_id INT REFERENCES duty_positions(id) ON DELETE SET NULL;

-- Rename a certification string inside every soldier's TEXT[] certifications column
CREATE OR REPLACE FUNCTION rename_certification(p_old TEXT, p_new TEXT)
RETURNS void LANGUAGE sql AS $$
  UPDATE soldiers
  SET certifications = array_replace(certifications, p_old, p_new)
  WHERE certifications @> ARRAY[p_old];
$$;
