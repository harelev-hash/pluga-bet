-- migration_v11_storage_location.sql
-- Adds storage location (אפסון) tracking for equipment assignments

CREATE TABLE storage_locations (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO storage_locations (name, sort_order) VALUES
  ('בטחונית 1', 1),
  ('בטחונית 2', 2),
  ('בטחונית 3', 3),
  ('רספיה',     4);

ALTER TABLE equipment_assignments
  ADD COLUMN storage_location_id INTEGER REFERENCES storage_locations(id) ON DELETE SET NULL,
  ADD COLUMN storage_soldier_id  INTEGER REFERENCES soldiers(id)          ON DELETE SET NULL;
