-- migration_v16_certification_types.sql
-- Replaces the hard-coded CERTIFICATION_OPTIONS constant in lib/utils.ts
-- with a DB-managed list of certification types.

CREATE TABLE certification_types (
  id            SERIAL PRIMARY KEY,
  name          TEXT    NOT NULL UNIQUE,
  display_order INT     DEFAULT 0,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Seed with the existing hard-coded list (same order as lib/utils.ts)
INSERT INTO certification_types (name, display_order) VALUES
  ('חמ"ל',       1),
  ('נהג',        2),
  ('פריה"ן',     3),
  ('מ"כ',        4),
  ('רופא',       5),
  ('חובש',       6),
  ('לוחם קרוב',  7),
  ('מחבל',       8),
  ('מקלענאי',    9),
  ('מרגמאי',    10),
  ('ממ"ג',      11),
  ('צלם',       12),
  ('פקע"ר',     13);
