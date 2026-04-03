-- migration_v20_fix_rls.sql
-- Fix: certification_types table was created in v16 without RLS policies.
-- This was flagged by Supabase security advisor.

ALTER TABLE certification_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read certification_types"
  ON certification_types FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth write certification_types"
  ON certification_types FOR ALL TO authenticated USING (true) WITH CHECK (true);
