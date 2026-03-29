-- Migration v15: Duty scheduling system
-- Replaces the simple guard_posts + operational_assignments with a full
-- time-slotted schedule supporting variable shift lengths, rest rules,
-- qualifications, standbys, and auto-scheduling.

-- ── 1. duty_positions ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS duty_positions (
  id                    SERIAL PRIMARY KEY,
  name                  TEXT NOT NULL,
  category              TEXT NOT NULL DEFAULT 'guard',
    -- 'guard' | 'watch' | 'standby' | 'mission'
  shift_duration_hours  NUMERIC NOT NULL DEFAULT 2,
  fixed_shift_starts    TEXT[],
    -- NULL = rolling (slots start every shift_duration_hours from 07:00)
    -- e.g. ARRAY['07:00','15:00','23:00'] for fixed 8-hour watch
  rest_hours_after      INT NOT NULL DEFAULT 6,
  pre_buffer_hours      INT NOT NULL DEFAULT 0,
    -- hours of rest *before* this assignment (e.g. for יזומה: 6)
  requires_qualification BOOLEAN NOT NULL DEFAULT FALSE,
  is_standby            BOOLEAN NOT NULL DEFAULT FALSE,
  standby_blocks_all    BOOLEAN NOT NULL DEFAULT FALSE,
    -- TRUE = this standby prevents any other assignments (חפ"ק)
    -- FALSE = standby can coexist with other assignments (חובש תורן)
  display_order         INT NOT NULL DEFAULT 0,
  color                 TEXT NOT NULL DEFAULT 'slate',
    -- tailwind color name: slate, blue, amber, emerald, red, purple…
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. position_time_rules ─────────────────────────────────────────────────
-- Defines how many soldiers are needed for a position during certain hours.
-- Allows "1 person during day, 2 at night" per position.
CREATE TABLE IF NOT EXISTS position_time_rules (
  id             SERIAL PRIMARY KEY,
  position_id    INT NOT NULL REFERENCES duty_positions(id) ON DELETE CASCADE,
  from_hour      INT NOT NULL CHECK (from_hour >= 0 AND from_hour <= 23),
  to_hour        INT NOT NULL CHECK (to_hour >= 0 AND to_hour <= 23),
    -- when from_hour > to_hour the rule wraps midnight (e.g. 19→7)
  required_count INT NOT NULL DEFAULT 1
);

-- ── 3. soldier_qualifications ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS soldier_qualifications (
  soldier_id  INT NOT NULL REFERENCES soldiers(id) ON DELETE CASCADE,
  position_id INT NOT NULL REFERENCES duty_positions(id) ON DELETE CASCADE,
  PRIMARY KEY (soldier_id, position_id)
);

-- ── 4. schedule_days ───────────────────────────────────────────────────────
-- One row per scheduling day. A "day" runs 07:00 on `date` → 13:00 next day.
CREATE TABLE IF NOT EXISTS schedule_days (
  id                    SERIAL PRIMARY KEY,
  date                  DATE NOT NULL UNIQUE,
  status                TEXT NOT NULL DEFAULT 'draft',
    -- 'draft' | 'published'
  fairness_lookback_days INT NOT NULL DEFAULT 7,
  created_by            UUID REFERENCES app_users(id),
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. shift_assignments ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shift_assignments (
  id               SERIAL PRIMARY KEY,
  schedule_day_id  INT NOT NULL REFERENCES schedule_days(id) ON DELETE CASCADE,
  position_id      INT NOT NULL REFERENCES duty_positions(id) ON DELETE CASCADE,
  slot_start       TIMESTAMPTZ NOT NULL,
  slot_end         TIMESTAMPTZ NOT NULL,
  soldier_id       INT NOT NULL REFERENCES soldiers(id) ON DELETE CASCADE,
  source           TEXT NOT NULL DEFAULT 'manual',
    -- 'auto' | 'manual'
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── 6. schedule_blackouts ─────────────────────────────────────────────────
-- Time windows where a position does not need staffing
-- (e.g. covered by another unit, or post temporarily closed).
CREATE TABLE IF NOT EXISTS schedule_blackouts (
  id               SERIAL PRIMARY KEY,
  schedule_day_id  INT NOT NULL REFERENCES schedule_days(id) ON DELETE CASCADE,
  position_id      INT NOT NULL REFERENCES duty_positions(id) ON DELETE CASCADE,
  from_time        TIMESTAMPTZ NOT NULL,
  to_time          TIMESTAMPTZ NOT NULL,
  reason           TEXT
);

-- ── 7. Migrate existing guard_posts → duty_positions ──────────────────────
INSERT INTO duty_positions (name, category, shift_duration_hours, rest_hours_after,
  requires_qualification, is_active, notes, display_order)
SELECT
  name, 'guard', 2, 6,
  CASE WHEN required_certification IS NOT NULL THEN TRUE ELSE FALSE END,
  is_active, notes,
  ROW_NUMBER() OVER (ORDER BY name)
FROM guard_posts
ON CONFLICT DO NOTHING;

-- Default time rule: 1 soldier needed at all times (for all migrated posts)
INSERT INTO position_time_rules (position_id, from_hour, to_hour, required_count)
SELECT id, 0, 0, 1   -- from_hour = to_hour = 0 means "all day" (handled in app)
FROM duty_positions
ON CONFLICT DO NOTHING;

-- ── 8. RLS ────────────────────────────────────────────────────────────────
ALTER TABLE duty_positions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE position_time_rules   ENABLE ROW LEVEL SECURITY;
ALTER TABLE soldier_qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_days         ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_assignments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_blackouts    ENABLE ROW LEVEL SECURITY;

-- Read: all authenticated users
CREATE POLICY "auth read duty_positions"         ON duty_positions         FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read position_time_rules"    ON position_time_rules    FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read soldier_qualifications" ON soldier_qualifications  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read schedule_days"          ON schedule_days          FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read shift_assignments"      ON shift_assignments      FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read schedule_blackouts"     ON schedule_blackouts     FOR SELECT TO authenticated USING (true);

-- Write: authenticated users (app enforces role checks)
CREATE POLICY "auth write duty_positions"         ON duty_positions         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth write position_time_rules"    ON position_time_rules    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth write soldier_qualifications" ON soldier_qualifications  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth write schedule_days"          ON schedule_days          FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth write shift_assignments"      ON shift_assignments      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth write schedule_blackouts"     ON schedule_blackouts     FOR ALL TO authenticated USING (true) WITH CHECK (true);
