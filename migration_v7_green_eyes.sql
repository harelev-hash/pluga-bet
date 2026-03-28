-- Green Eyes (ירוק בעיניים) daily equipment check reports

CREATE TABLE IF NOT EXISTS green_eyes_reports (
  id          SERIAL PRIMARY KEY,
  report_date DATE        NOT NULL DEFAULT CURRENT_DATE,
  department_id INTEGER   REFERENCES departments(id),
  template_id   INTEGER   REFERENCES equipment_templates(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS green_eyes_checks (
  id            SERIAL  PRIMARY KEY,
  report_id     INTEGER NOT NULL REFERENCES green_eyes_reports(id) ON DELETE CASCADE,
  soldier_id    INTEGER NOT NULL REFERENCES soldiers(id),
  assignment_id INTEGER NOT NULL REFERENCES equipment_assignments(id),
  is_present    BOOLEAN NOT NULL DEFAULT TRUE,
  notes         TEXT,
  UNIQUE (report_id, assignment_id)
);
