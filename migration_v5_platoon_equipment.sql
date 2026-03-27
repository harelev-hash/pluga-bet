-- =============================================
-- Migration v5: Platoon equipment types catalog
-- Run in Supabase SQL Editor
-- Inserts only if name doesn't already exist
-- =============================================

INSERT INTO equipment_types (name, category, is_serialized, ownership)
SELECT t.name, t.category, t.is_serialized, 'platoon'
FROM (VALUES

  -- אמצעים (all serialized)
  ('משל"ש',           'אמצעים', true),
  ('ידית הסתערות',    'אמצעים', true),
  ('קירו',            'אמצעים', true),
  ('מתאם תומר',       'אמצעים', true),
  ('PEQ',             'אמצעים', true),
  ('פנס חובש',        'אמצעים', true),
  ('דו-עיני',         'אמצעים', true),

  -- ווסטים (not serialized)
  ('ווסט מרום',       'ווסטים', false),
  ('ווסט עמרן גדודי', 'ווסטים', false),

  -- קסדות (not serialized)
  ('קסדה טקטית',      'קסדות', false),
  ('קסדה רגילה',      'קסדות', false),

  -- תיק לוחם (not serialized)
  ('קרמי',            'תיק לוחם', false),
  ('קט',              'תיק לוחם', false),
  ('אלונקה',          'תיק לוחם', false),
  ('תופים',           'תיק לוחם', false),
  ('ערכת כלבו',       'תיק לוחם', false),

  -- ציוד אישי (not serialized)
  ('שקש',             'ציוד אישי', false),
  ('מדים',            'ציוד אישי', false)

) AS t(name, category, is_serialized)
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_types WHERE equipment_types.name = t.name
);
