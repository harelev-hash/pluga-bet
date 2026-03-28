-- Track which app user performed each action

ALTER TABLE green_eyes_reports
  ADD COLUMN IF NOT EXISTS performed_by UUID REFERENCES app_users(id) ON DELETE SET NULL;

ALTER TABLE equipment_assignments
  ADD COLUMN IF NOT EXISTS performed_by UUID REFERENCES app_users(id) ON DELETE SET NULL;
