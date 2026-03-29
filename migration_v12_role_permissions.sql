-- migration_v12_role_permissions.sql
-- Role-based permission configuration table

CREATE TABLE role_permissions (
  role        TEXT PRIMARY KEY,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed defaults
INSERT INTO role_permissions (role, permissions) VALUES
  ('sys_admin',  ARRAY['*']),
  ('hr',         ARRAY[
    'nav:soldiers', 'nav:attendance', 'nav:tracking', 'nav:equipment', 'nav:melm',
    'soldiers:edit', 'attendance:edit', 'tracking:edit',
    'equipment:report', 'equipment:green_eyes',
    'melm:view', 'melm:create'
  ]),
  ('rsfp',       ARRAY[
    'nav:equipment', 'nav:melm',
    'equipment:sign', 'equipment:reception', 'equipment:report',
    'equipment:green_eyes', 'equipment:inventory', 'equipment:import',
    'equipment:admin', 'equipment:storage_edit',
    'melm:view', 'melm:create', 'melm:resap', 'melm:close'
  ]),
  ('commander',  ARRAY[
    'nav:equipment', 'nav:tracking', 'nav:ops',
    'equipment:report', 'equipment:green_eyes', 'equipment:storage_edit',
    'tracking:edit', 'ops:edit',
    'melm:view'
  ]),
  ('viewer',     ARRAY[
    'nav:soldiers', 'nav:attendance', 'nav:tracking',
    'nav:equipment', 'nav:melm', 'nav:ops',
    'equipment:report', 'equipment:green_eyes',
    'melm:view'
  ]);

-- RLS: everyone can read permissions (needed for sidebar filtering)
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "all read role_permissions" ON role_permissions
  FOR SELECT USING (true);

CREATE POLICY "admin write role_permissions" ON role_permissions
  FOR ALL
  USING (EXISTS (SELECT 1 FROM app_users u WHERE u.id = auth.uid() AND u.role = 'sys_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM app_users u WHERE u.id = auth.uid() AND u.role = 'sys_admin'));
