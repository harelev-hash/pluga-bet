-- =============================================
-- Migration v3: Tracking system (redesign) + period_soldiers
-- Run in Supabase SQL Editor
-- NOTE: Drops old tracking_entries + tracking_events (were unused scaffolding)
-- =============================================

-- Drop old scaffold tables
DROP TABLE IF EXISTS tracking_entries CASCADE;
DROP TABLE IF EXISTS tracking_events  CASCADE;

-- Who's in each reserve period
CREATE TABLE IF NOT EXISTS period_soldiers (
  period_id  INTEGER NOT NULL REFERENCES reserve_periods(id) ON DELETE CASCADE,
  soldier_id INTEGER NOT NULL REFERENCES soldiers(id)        ON DELETE CASCADE,
  PRIMARY KEY (period_id, soldier_id)
);

-- Tracking events (e.g. "הגעה לחיול", "חיסון", "השתלמות בטיחות")
CREATE TABLE IF NOT EXISTS tracking_events (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  event_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  period_id   INTEGER REFERENCES reserve_periods(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- One entry per soldier per tracking event
CREATE TABLE IF NOT EXISTS tracking_entries (
  id         SERIAL PRIMARY KEY,
  event_id   INTEGER NOT NULL REFERENCES tracking_events(id) ON DELETE CASCADE,
  soldier_id INTEGER NOT NULL REFERENCES soldiers(id)         ON DELETE CASCADE,
  status     TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'done' | 'exempt'
  notes      TEXT,
  marked_at  TIMESTAMPTZ,
  UNIQUE(event_id, soldier_id)
);

CREATE INDEX IF NOT EXISTS idx_tracking_entries_event   ON tracking_entries(event_id);
CREATE INDEX IF NOT EXISTS idx_tracking_entries_soldier ON tracking_entries(soldier_id);
CREATE INDEX IF NOT EXISTS idx_period_soldiers_period   ON period_soldiers(period_id);
