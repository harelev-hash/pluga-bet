-- migration_v14_equipment_subtypes.sql
-- Convert ווסט and קסדה attribute variants into separate equipment types

DO $$
DECLARE
  vest_id    INTEGER;
  helmet_id  INTEGER;

  v_amran    INTEGER;
  v_modular  INTEGER;
  v_hovesh   INTEGER;
  v_matool   INTEGER;

  h_bet      INTEGER;
  h_gimel    INTEGER;
  h_mem      INTEGER;
  h_kuf      INTEGER;
  h_kala     INTEGER;

BEGIN
  SELECT id INTO vest_id   FROM equipment_types WHERE name = 'ווסט'  LIMIT 1;
  SELECT id INTO helmet_id FROM equipment_types WHERE name = 'קסדה' LIMIT 1;

  -- ── ווסט sub-types ──────────────────────────────────────────────
  INSERT INTO equipment_types (category, name, is_serialized, unit, ownership)
    SELECT category, 'ווסט עמרן',     is_serialized, unit, ownership FROM equipment_types WHERE id = vest_id
  RETURNING id INTO v_amran;

  INSERT INTO equipment_types (category, name, is_serialized, unit, ownership)
    SELECT category, 'ווסט מודולארי', is_serialized, unit, ownership FROM equipment_types WHERE id = vest_id
  RETURNING id INTO v_modular;

  INSERT INTO equipment_types (category, name, is_serialized, unit, ownership)
    SELECT category, 'ווסט חובש',     is_serialized, unit, ownership FROM equipment_types WHERE id = vest_id
  RETURNING id INTO v_hovesh;

  INSERT INTO equipment_types (category, name, is_serialized, unit, ownership)
    SELECT category, 'ווסט מטול',     is_serialized, unit, ownership FROM equipment_types WHERE id = vest_id
  RETURNING id INTO v_matool;

  -- ── קסדה sub-types ──────────────────────────────────────────────
  INSERT INTO equipment_types (category, name, is_serialized, unit, ownership)
    SELECT category, 'קסדה מידה ב',   is_serialized, unit, ownership FROM equipment_types WHERE id = helmet_id
  RETURNING id INTO h_bet;

  INSERT INTO equipment_types (category, name, is_serialized, unit, ownership)
    SELECT category, 'קסדה מידה ג',   is_serialized, unit, ownership FROM equipment_types WHERE id = helmet_id
  RETURNING id INTO h_gimel;

  INSERT INTO equipment_types (category, name, is_serialized, unit, ownership)
    SELECT category, 'קסדה מידה מ',   is_serialized, unit, ownership FROM equipment_types WHERE id = helmet_id
  RETURNING id INTO h_mem;

  INSERT INTO equipment_types (category, name, is_serialized, unit, ownership)
    SELECT category, 'קסדה מידה ק',   is_serialized, unit, ownership FROM equipment_types WHERE id = helmet_id
  RETURNING id INTO h_kuf;

  INSERT INTO equipment_types (category, name, is_serialized, unit, ownership)
    SELECT category, 'קסדה קלה',      is_serialized, unit, ownership FROM equipment_types WHERE id = helmet_id
  RETURNING id INTO h_kala;

  -- ── Update assignments that reference type_id directly ──────────
  UPDATE equipment_assignments SET type_id = v_amran,   attribute = NULL WHERE type_id = vest_id   AND attribute = 'עמרן';
  UPDATE equipment_assignments SET type_id = v_modular, attribute = NULL WHERE type_id = vest_id   AND attribute = 'מודולארי';
  UPDATE equipment_assignments SET type_id = v_hovesh,  attribute = NULL WHERE type_id = vest_id   AND attribute = 'חובש';
  UPDATE equipment_assignments SET type_id = v_matool,  attribute = NULL WHERE type_id = vest_id   AND attribute = 'מטול';

  UPDATE equipment_assignments SET type_id = h_bet,     attribute = NULL WHERE type_id = helmet_id AND attribute = 'ב';
  UPDATE equipment_assignments SET type_id = h_gimel,   attribute = NULL WHERE type_id = helmet_id AND attribute = 'ג';
  UPDATE equipment_assignments SET type_id = h_mem,     attribute = NULL WHERE type_id = helmet_id AND attribute = 'מ';
  UPDATE equipment_assignments SET type_id = h_kuf,     attribute = NULL WHERE type_id = helmet_id AND attribute = 'ק';
  UPDATE equipment_assignments SET type_id = h_kala,    attribute = NULL WHERE type_id = helmet_id AND attribute = 'קלה';

  -- ── Update assignments that reference item_id (serialized items) ─
  -- Updates the item's type, then clears the attribute on the assignment
  UPDATE equipment_items SET type_id = h_gimel
  WHERE type_id = helmet_id
    AND id IN (SELECT item_id FROM equipment_assignments WHERE item_id IS NOT NULL AND attribute = 'ג');

  UPDATE equipment_assignments SET attribute = NULL
  WHERE item_id IS NOT NULL AND attribute IN ('ב','ג','מ','ק','קלה')
    AND item_id IN (SELECT id FROM equipment_items WHERE type_id IN (h_bet, h_gimel, h_mem, h_kuf, h_kala));

  -- ── Note: old "ווסט" and "קסדה" types are intentionally kept    ─
  -- ── Delete them manually from the admin UI once you've verified  ─

END $$;
