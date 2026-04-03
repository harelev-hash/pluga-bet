-- migration_v21_qualifications.sql
-- Splits the current 'certifications' concept into two:
--   certifications (TEXT[]) → renamed in UI to "תפקיד בסבב" (rotation role)
--   qualifications  (TEXT[]) → new field, UI label "הסמכות" (permanent military qualifications)

-- New column on soldiers for permanent qualifications
ALTER TABLE soldiers
  ADD COLUMN IF NOT EXISTS qualifications TEXT[] NOT NULL DEFAULT '{}';

-- New managed list of qualification types
CREATE TABLE qualification_types (
  id            SERIAL PRIMARY KEY,
  name          TEXT    NOT NULL UNIQUE,
  display_order INT     DEFAULT 0,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE qualification_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read qualification_types"
  ON qualification_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write qualification_types"
  ON qualification_types FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- RPC to rename a qualification across all soldiers atomically
CREATE OR REPLACE FUNCTION rename_qualification(p_old TEXT, p_new TEXT)
RETURNS void LANGUAGE sql AS $$
  UPDATE soldiers
  SET qualifications = array_replace(qualifications, p_old, p_new)
  WHERE qualifications @> ARRAY[p_old];
$$;
