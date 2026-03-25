-- ================================================================
-- פלוגה ב' 7007 - Seed Data
-- Run AFTER schema.sql
-- ================================================================

-- Departments
INSERT INTO departments (name, display_order) VALUES
  ('מחלקה 1', 1),
  ('מחלקה 2', 2),
  ('מחלקה 3', 3),
  ('חפ"ק', 4),
  ('מפל"ג', 5)
ON CONFLICT (name) DO NOTHING;

-- Equipment types
INSERT INTO equipment_types (category, name, is_serialized, unit) VALUES
  -- נשק
  ('נשק', 'רובה M16', true, 'יח'''),
  ('נשק', 'רובה M4', true, 'יח'''),
  ('נשק', 'רובה TAVOR', true, 'יח'''),
  ('נשק', 'נשק קצר', true, 'יח'''),
  ('נשק', 'מקלע MAG', true, 'יח'''),
  ('נשק', 'מקלע NEGEV', true, 'יח'''),
  -- כוונות ואופטיקה
  ('כוונות ואופטיקה', 'PEQ', true, 'יח'''),
  ('כוונות ואופטיקה', 'כוונת', true, 'יח'''),
  ('כוונות ואופטיקה', 'מל-עיון', true, 'יח'''),
  ('כוונות ואופטיקה', 'קריית', true, 'יח'''),
  -- תקשורת
  ('תקשורת', 'שו"ש', true, 'יח'''),
  ('תקשורת', 'שר"ש', true, 'יח'''),
  -- ציוד גוף
  ('ציוד גוף', 'ווריור', false, 'יח'''),
  ('ציוד גוף', 'ברכיות קרוי', false, 'יח'''),
  ('ציוד גוף', 'פנס לוחש', false, 'יח'''),
  ('ציוד גוף', 'תוכן תדמור', false, 'יח'''),
  ('ציוד גוף', 'קסדה', true, 'יח'''),
  ('ציוד גוף', 'אפוד קרב', false, 'יח'''),
  ('ציוד גוף', 'ביגוד קרב (מכנסיים)', false, 'יח'''),
  ('ציוד גוף', 'ביגוד קרב (חולצה)', false, 'יח'''),
  -- ציוד מיוחד
  ('ציוד מיוחד', 'מכשיר ראיית לילה', true, 'יח'''),
  ('ציוד מיוחד', 'כלי חפירה', false, 'יח'''),
  ('ציוד מיוחד', 'ערכת עזרה ראשונה', false, 'סט')
ON CONFLICT (category, name) DO NOTHING;

-- Guard posts
INSERT INTO guard_posts (name, required_certification, min_soldiers) VALUES
  ('עמדה א''', NULL, 2),
  ('עמדה ב''', NULL, 2),
  ('עמדה ג''', NULL, 2),
  ('חמ"ל', 'חמ"ל', 1),
  ('שער', NULL, 1),
  ('סיור', NULL, 4),
  ('תצפית', NULL, 2)
ON CONFLICT (name) DO NOTHING;

-- Current reserve period
INSERT INTO reserve_periods (name, start_date, is_current) VALUES
  ('סבב 7 - 2026', CURRENT_DATE, true)
ON CONFLICT DO NOTHING;
