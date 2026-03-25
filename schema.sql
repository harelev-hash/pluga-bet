-- ================================================================
-- פלוגה ב' 7007 - מערכת ניהול
-- Database Schema - Run this in Supabase SQL Editor
-- ================================================================

-- Departments (מחלקות)
CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- App users - extends Supabase auth.users
CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'viewer',
  -- roles: sys_admin | hr | rsfp | commander | viewer
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Soldiers (חיילים)
CREATE TABLE IF NOT EXISTS soldiers (
  id SERIAL PRIMARY KEY,
  id_number TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  rank TEXT DEFAULT 'טוראי',
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  role_in_unit TEXT,
  personal_phone TEXT,
  emergency_contact TEXT,
  home_address TEXT,
  city TEXT,
  certifications TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reserve periods (סבבים)
CREATE TABLE IF NOT EXISTS reserve_periods (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily attendance (נוכחות יומית)
CREATE TABLE IF NOT EXISTS daily_attendance (
  id SERIAL PRIMARY KEY,
  soldier_id INTEGER NOT NULL REFERENCES soldiers(id) ON DELETE CASCADE,
  period_id INTEGER REFERENCES reserve_periods(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'present',
  -- present | absent | sick | approved_absence | vacation | excused | weekend
  notes TEXT,
  recorded_by UUID REFERENCES app_users(id),
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(soldier_id, date)
);

-- Tracking events (מעקבים)
CREATE TABLE IF NOT EXISTS tracking_events (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  created_by UUID REFERENCES app_users(id),
  is_closed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tracking entries - free-text updates on tracking events
CREATE TABLE IF NOT EXISTS tracking_entries (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES tracking_events(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  -- open | in_progress | resolved
  created_by UUID REFERENCES app_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Equipment types (סוגי ציוד)
CREATE TABLE IF NOT EXISTS equipment_types (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  is_serialized BOOLEAN DEFAULT FALSE,
  unit TEXT DEFAULT 'יח''',
  description TEXT,
  UNIQUE(category, name)
);

-- Equipment items (פריטי ציוד)
CREATE TABLE IF NOT EXISTS equipment_items (
  id SERIAL PRIMARY KEY,
  type_id INTEGER NOT NULL REFERENCES equipment_types(id),
  serial_number TEXT,
  quantity INTEGER DEFAULT 1,
  condition TEXT DEFAULT 'serviceable',
  -- serviceable | needs_repair | unserviceable
  location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Soldier equipment quantities (ציוד כמותי לחייל)
CREATE TABLE IF NOT EXISTS soldier_equipment (
  id SERIAL PRIMARY KEY,
  soldier_id INTEGER NOT NULL REFERENCES soldiers(id) ON DELETE CASCADE,
  type_id INTEGER NOT NULL REFERENCES equipment_types(id),
  quantity INTEGER NOT NULL DEFAULT 0,
  updated_by UUID REFERENCES app_users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(soldier_id, type_id)
);

-- Equipment transaction history (היסטוריית העברות)
CREATE TABLE IF NOT EXISTS equipment_transactions (
  id SERIAL PRIMARY KEY,
  item_id INTEGER REFERENCES equipment_items(id) ON DELETE SET NULL,
  type_id INTEGER REFERENCES equipment_types(id),
  soldier_id INTEGER REFERENCES soldiers(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  -- assign | return | transfer | lost | found | condition_update
  quantity INTEGER DEFAULT 1,
  performed_by UUID REFERENCES app_users(id),
  action_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- MELM requests (מלא מחדש)
CREATE TABLE IF NOT EXISTS melm_requests (
  id SERIAL PRIMARY KEY,
  title TEXT,
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'open',
  -- open | in_progress | resolved | closed
  notes TEXT,
  submitted_by UUID REFERENCES app_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- MELM items
CREATE TABLE IF NOT EXISTS melm_items (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES melm_requests(id) ON DELETE CASCADE,
  type_id INTEGER REFERENCES equipment_types(id) ON DELETE SET NULL,
  quantity_requested INTEGER NOT NULL DEFAULT 1,
  quantity_fulfilled INTEGER NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'pending',
  -- pending | fulfilled | partial | rejected
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Guard posts (עמדות שמירה)
CREATE TABLE IF NOT EXISTS guard_posts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  required_certification TEXT,
  min_soldiers INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT
);

-- Operational assignments (שיבוץ יומי)
CREATE TABLE IF NOT EXISTS operational_assignments (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  shift TEXT,
  post_id INTEGER NOT NULL REFERENCES guard_posts(id) ON DELETE CASCADE,
  soldier_id INTEGER NOT NULL REFERENCES soldiers(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES app_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- Operational summaries (תובנות / דגשים)
CREATE TABLE IF NOT EXISTS operational_summaries (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  activity_type TEXT,
  activity_date DATE NOT NULL,
  content TEXT NOT NULL,
  key_points TEXT[] DEFAULT '{}',
  department_id INTEGER REFERENCES departments(id),
  submitted_by UUID REFERENCES app_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- Row Level Security
-- ================================================================

ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE soldiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE soldier_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE melm_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE melm_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE guard_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE operational_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE operational_summaries ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read everything
CREATE POLICY "auth read departments" ON departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read soldiers" ON soldiers FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read reserve_periods" ON reserve_periods FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read daily_attendance" ON daily_attendance FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read tracking_events" ON tracking_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read tracking_entries" ON tracking_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read equipment_types" ON equipment_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read equipment_items" ON equipment_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read soldier_equipment" ON soldier_equipment FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read equipment_transactions" ON equipment_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read melm_requests" ON melm_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read melm_items" ON melm_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read guard_posts" ON guard_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read operational_assignments" ON operational_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read operational_summaries" ON operational_summaries FOR SELECT TO authenticated USING (true);

-- app_users: each user can read own row; admins read all
CREATE POLICY "user read own" ON app_users FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "admin read all users" ON app_users FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM app_users u WHERE u.id = auth.uid() AND u.role = 'sys_admin'));

-- Write policies - all authenticated can write (role enforcement in app logic)
CREATE POLICY "auth write soldiers" ON soldiers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth write attendance" ON daily_attendance FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth write tracking events" ON tracking_events FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth write tracking entries" ON tracking_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth write equipment items" ON equipment_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth write soldier equipment" ON soldier_equipment FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth write transactions" ON equipment_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth write melm requests" ON melm_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth write melm items" ON melm_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth write assignments" ON operational_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth write summaries" ON operational_summaries FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Admin-only writes
CREATE POLICY "admin write departments" ON departments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM app_users u WHERE u.id = auth.uid() AND u.role IN ('sys_admin','hr')))
  WITH CHECK (EXISTS (SELECT 1 FROM app_users u WHERE u.id = auth.uid() AND u.role IN ('sys_admin','hr')));
CREATE POLICY "admin write reserve periods" ON reserve_periods FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM app_users u WHERE u.id = auth.uid() AND u.role IN ('sys_admin','hr')))
  WITH CHECK (EXISTS (SELECT 1 FROM app_users u WHERE u.id = auth.uid() AND u.role IN ('sys_admin','hr')));
CREATE POLICY "admin write equipment types" ON equipment_types FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM app_users u WHERE u.id = auth.uid() AND u.role IN ('sys_admin','rsfp')))
  WITH CHECK (EXISTS (SELECT 1 FROM app_users u WHERE u.id = auth.uid() AND u.role IN ('sys_admin','rsfp')));
CREATE POLICY "admin write guard posts" ON guard_posts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM app_users u WHERE u.id = auth.uid() AND u.role = 'sys_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM app_users u WHERE u.id = auth.uid() AND u.role = 'sys_admin'));
CREATE POLICY "admin write app_users" ON app_users FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM app_users u WHERE u.id = auth.uid() AND u.role = 'sys_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM app_users u WHERE u.id = auth.uid() AND u.role = 'sys_admin'));

-- ================================================================
-- Auto-create app_user on first login
-- ================================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO app_users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    'viewer'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
