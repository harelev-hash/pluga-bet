-- ================================================================
-- Migration v2: Equipment Assignments + Templates
-- Run this in Supabase SQL Editor
-- ================================================================

-- 1. Add ownership to equipment_types
ALTER TABLE equipment_types
  ADD COLUMN IF NOT EXISTS ownership TEXT NOT NULL DEFAULT 'platoon';
-- ownership values: personal | platoon | battalion

-- 2. Equipment assignments — the core of the system
CREATE TABLE IF NOT EXISTS equipment_assignments (
  id SERIAL PRIMARY KEY,
  soldier_id INTEGER NOT NULL REFERENCES soldiers(id) ON DELETE CASCADE,
  item_id INTEGER REFERENCES equipment_items(id) ON DELETE SET NULL,   -- serialized item (e.g. תיק לוחם מס' 17)
  type_id INTEGER REFERENCES equipment_types(id) ON DELETE SET NULL,   -- quantity item (e.g. מחסניות)
  quantity INTEGER NOT NULL DEFAULT 1,
  attribute TEXT,                                                        -- e.g. "עמרן" for vest, "ג" for helmet
  period_id INTEGER REFERENCES reserve_periods(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active',
  -- status: active | returned | transferred | lost
  condition_in TEXT NOT NULL DEFAULT 'serviceable',
  -- condition: serviceable | worn | damaged
  condition_out TEXT,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  signed_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  returned_at TIMESTAMPTZ,
  returned_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_assignment_target CHECK (item_id IS NOT NULL OR type_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_assignments_soldier ON equipment_assignments(soldier_id);
CREATE INDEX IF NOT EXISTS idx_assignments_item    ON equipment_assignments(item_id);
CREATE INDEX IF NOT EXISTS idx_assignments_type    ON equipment_assignments(type_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status  ON equipment_assignments(status);
CREATE INDEX IF NOT EXISTS idx_assignments_period  ON equipment_assignments(period_id);

-- 3. Equipment templates (by role / אפיון)
CREATE TABLE IF NOT EXISTS equipment_templates (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Template items
CREATE TABLE IF NOT EXISTS equipment_template_items (
  id SERIAL PRIMARY KEY,
  template_id INTEGER NOT NULL REFERENCES equipment_templates(id) ON DELETE CASCADE,
  type_id INTEGER NOT NULL REFERENCES equipment_types(id) ON DELETE CASCADE,
  default_quantity INTEGER NOT NULL DEFAULT 1,
  requires_attribute BOOLEAN NOT NULL DEFAULT FALSE,
  attribute_options TEXT[] NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(template_id, type_id)
);

-- ================================================================
-- RLS
-- ================================================================
ALTER TABLE equipment_assignments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_templates      ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_template_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read equipment_assignments"    ON equipment_assignments    FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write equipment_assignments"   ON equipment_assignments    FOR ALL    TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth read equipment_templates"      ON equipment_templates      FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write equipment_templates"     ON equipment_templates      FOR ALL    TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth read equipment_template_items" ON equipment_template_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write equipment_template_items" ON equipment_template_items FOR ALL   TO authenticated USING (true) WITH CHECK (true);

-- ================================================================
-- Seed: basic equipment types for תיק לוחם
-- ================================================================
INSERT INTO equipment_types (category, name, is_serialized, unit, ownership) VALUES
  ('תיק לוחם', 'תיק לוחם',     TRUE,  'יח''', 'platoon'),
  ('תיק לוחם', 'ווסט',          FALSE, 'יח''', 'platoon'),
  ('תיק לוחם', 'קסדה',          FALSE, 'יח''', 'platoon'),
  ('תיק לוחם', 'ברכיות',        FALSE, 'זוג',  'platoon'),
  ('תיק לוחם', 'שלוקר',         FALSE, 'יח''', 'platoon'),
  ('תיק לוחם', 'מחסניות',       FALSE, 'יח''', 'battalion'),
  ('תיק לוחם', 'מצנפת',         FALSE, 'יח''', 'personal'),
  ('תיק לוחם', 'שומר אחי',      FALSE, 'יח''', 'personal'),
  ('תיק לוחם', 'רצועה לנשק',    FALSE, 'יח''', 'personal'),
  ('תיק לוחם', 'ח"ע',           FALSE, 'יח''', 'platoon'),
  ('תיק לוחם', 'ת"א',           FALSE, 'יח''', 'personal'),
  ('תיק לוחם', 'חלפ"ס סט',     FALSE, 'סט',   'personal'),
  ('ביגוד',    'חגורה',          FALSE, 'יח''', 'personal'),
  ('ביגוד',    'חסה',            FALSE, 'יח''', 'platoon'),
  ('ביגוד',    'חולצות ב',       FALSE, 'יח''', 'personal'),
  ('ביגוד',    'חולצות ג',       FALSE, 'יח''', 'personal'),
  ('ציוד כללי','את חפירה אישי',  FALSE, 'יח''', 'platoon'),
  ('ציוד כללי','גריקן גדול',     FALSE, 'יח''', 'platoon'),
  ('ציוד כללי','גריקן קטן',      FALSE, 'יח''', 'platoon')
ON CONFLICT (category, name) DO NOTHING;

-- ================================================================
-- Seed: role templates
-- ================================================================
INSERT INTO equipment_templates (name, description) VALUES
  ('לוחם',  'ציוד סטנדרטי לתפקיד לוחם'),
  ('מטול',  'ציוד סטנדרטי לתפקיד מטול'),
  ('נגב',   'ציוד סטנדרטי לתפקיד נגב'),
  ('מאג',   'ציוד סטנדרטי לתפקיד מאג'),
  ('חובש',  'ציוד סטנדרטי לתפקיד חובש')
ON CONFLICT (name) DO NOTHING;

-- ================================================================
-- Seed: template items for לוחם (adjust type IDs after running)
-- The WITH clause resolves IDs dynamically
-- ================================================================
WITH
  tmpl AS (SELECT id FROM equipment_templates WHERE name = 'לוחם'),
  t_tik     AS (SELECT id FROM equipment_types WHERE name = 'תיק לוחם'),
  t_vest    AS (SELECT id FROM equipment_types WHERE name = 'ווסט'),
  t_helmet  AS (SELECT id FROM equipment_types WHERE name = 'קסדה'),
  t_knee    AS (SELECT id FROM equipment_types WHERE name = 'ברכיות'),
  t_shluk   AS (SELECT id FROM equipment_types WHERE name = 'שלוקר'),
  t_mag     AS (SELECT id FROM equipment_types WHERE name = 'מחסניות'),
  t_mitz    AS (SELECT id FROM equipment_types WHERE name = 'מצנפת'),
  t_shomer  AS (SELECT id FROM equipment_types WHERE name = 'שומר אחי'),
  t_strap   AS (SELECT id FROM equipment_types WHERE name = 'רצועה לנשק'),
  t_ce      AS (SELECT id FROM equipment_types WHERE name = 'ח"ע'),
  t_fa      AS (SELECT id FROM equipment_types WHERE name = 'ת"א'),
  t_unifrm  AS (SELECT id FROM equipment_types WHERE name = 'חלפ"ס סט')
INSERT INTO equipment_template_items (template_id, type_id, default_quantity, requires_attribute, attribute_options, sort_order)
SELECT tmpl.id, t_tik.id,    1, FALSE, '{}',                                        1  FROM tmpl, t_tik    UNION ALL
SELECT tmpl.id, t_vest.id,   1, TRUE,  ARRAY['עמרן','מודולארי','מטול','חובש'],      2  FROM tmpl, t_vest   UNION ALL
SELECT tmpl.id, t_helmet.id, 1, TRUE,  ARRAY['ג','מ','ב','ר'],                       3  FROM tmpl, t_helmet UNION ALL
SELECT tmpl.id, t_knee.id,   1, FALSE, '{}',                                        4  FROM tmpl, t_knee   UNION ALL
SELECT tmpl.id, t_shluk.id,  1, FALSE, '{}',                                        5  FROM tmpl, t_shluk  UNION ALL
SELECT tmpl.id, t_mag.id,    6, FALSE, '{}',                                        6  FROM tmpl, t_mag    UNION ALL
SELECT tmpl.id, t_mitz.id,   1, FALSE, '{}',                                        7  FROM tmpl, t_mitz   UNION ALL
SELECT tmpl.id, t_shomer.id, 1, FALSE, '{}',                                        8  FROM tmpl, t_shomer UNION ALL
SELECT tmpl.id, t_strap.id,  1, FALSE, '{}',                                        9  FROM tmpl, t_strap  UNION ALL
SELECT tmpl.id, t_ce.id,     1, FALSE, '{}',                                        10 FROM tmpl, t_ce     UNION ALL
SELECT tmpl.id, t_fa.id,     1, FALSE, '{}',                                        11 FROM tmpl, t_fa     UNION ALL
SELECT tmpl.id, t_unifrm.id, 1, FALSE, '{}',                                        12 FROM tmpl, t_unifrm
ON CONFLICT (template_id, type_id) DO NOTHING;
