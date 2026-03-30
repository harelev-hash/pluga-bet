-- migration_v19_tracking_snapshot.sql
-- Snapshot the soldier name and storage location at report-save time,
-- so history always shows what was recorded — not the current live values.

ALTER TABLE equipment_tracking_checks
  ADD COLUMN IF NOT EXISTS snapshot_soldier_name TEXT,
  ADD COLUMN IF NOT EXISTS snapshot_storage_name TEXT;
