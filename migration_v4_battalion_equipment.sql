-- =============================================
-- Migration v4: Battalion equipment types catalog
-- Run in Supabase SQL Editor
-- Inserts only if name doesn't already exist
-- =============================================

INSERT INTO equipment_types (name, category, is_serialized, ownership)
SELECT t.name, t.category, t.is_serialized, 'battalion'
FROM (VALUES
  -- נשק (all serialized)
  ('M4',              'נשק', true),
  ('M5',              'נשק', true),
  ('M16',             'נשק', true),
  ('קלע',             'נשק', true),
  ('מפרומור',         'נשק', true),
  ('נשק מטול',        'נשק', true),
  ('מטול M203',       'נשק', true),
  ('נגב',             'נשק', true),
  ('מאג',             'נשק', true),
  ('M24',             'נשק', true),
  ('MARK5',           'נשק', true),

  -- כוונות (all serialized)
  ('טריג''',           'כוונות', true),
  ('טריג'' נקודה אדומה','כוונות', true),
  ('אקילה X4',        'כוונות', true),
  ('אקילה X6',        'כוונות', true),
  ('ליאור X3',        'כוונות', true),
  ('ליאור X4',        'כוונות', true),
  ('לאופולד 131',     'כוונות', true),
  ('HTR',             'כוונות', true),
  ('מארק 6',          'כוונות', true),

  -- אמצעים לנשק
  ('ציין לייזר לנגב', 'אמצעים לנשק', true),
  ('מט"ל WG-III',     'אמצעים לנשק', true),
  ('קנספ נגב',        'אמצעים לנשק', false),
  ('קנספ מאג',        'אמצעים לנשק', false),
  ('בורסייט',         'אמצעים לנשק', false),
  ('מט"ל צלפים',      'אמצעים לנשק', false),

  -- אמצעים (all serialized)
  ('סמן טאץ''',        'אמצעים', true),
  ('זאבון',           'אמצעים', true),
  ('שח"ע',            'אמצעים', true),
  ('שח"מ',            'אמצעים', true),
  ('מכבים',           'אמצעים', true),
  ('מכבית',           'אמצעים', true),
  ('נועה',            'אמצעים', true),
  ('עידו',            'אמצעים', true),
  ('עמית',            'אמצעים', true),
  ('ערמון',           'אמצעים', true),
  ('מכפל',            'אמצעים', true),
  ('מיקרון',          'אמצעים', true),
  ('תהל',             'אמצעים', true),
  ('רחפן EVO',        'אמצעים', true),
  ('דיויד',           'אמצעים', true),
  ('LPL',             'אמצעים', true),
  ('מאתר',            'אמצעים', true),

  -- ניווט (none serialized)
  ('מצפן',            'ניווט', false),
  ('משקפת מפקד',      'ניווט', false),
  ('יראור',           'ניווט', false)

) AS t(name, category, is_serialized)
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_types WHERE equipment_types.name = t.name
);
