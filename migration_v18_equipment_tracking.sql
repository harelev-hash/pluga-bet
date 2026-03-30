-- migration_v18_equipment_tracking.sql
-- Daily equipment tracking reports — item-centric view (vs. soldier-centric green_eyes)

CREATE TABLE equipment_tracking_reports (
  id           SERIAL PRIMARY KEY,
  report_date  DATE    NOT NULL,
  template_ids INT[]   NOT NULL DEFAULT '{}',   -- which templates were selected (empty = all)
  performed_by UUID    REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE equipment_tracking_checks (
  id            SERIAL PRIMARY KEY,
  report_id     INT  NOT NULL REFERENCES equipment_tracking_reports(id) ON DELETE CASCADE,
  assignment_id INT  NOT NULL REFERENCES equipment_assignments(id)      ON DELETE CASCADE,
  is_present    BOOLEAN NOT NULL DEFAULT FALSE
);

ALTER TABLE equipment_tracking_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_tracking_checks  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read equipment_tracking_reports"
  ON equipment_tracking_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write equipment_tracking_reports"
  ON equipment_tracking_reports FOR ALL    TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth read equipment_tracking_checks"
  ON equipment_tracking_checks FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write equipment_tracking_checks"
  ON equipment_tracking_checks FOR ALL    TO authenticated USING (true) WITH CHECK (true);
