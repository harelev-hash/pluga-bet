-- migration_v13_role_labels.sql
-- Add display label to role_permissions, allow dynamic roles

ALTER TABLE role_permissions ADD COLUMN label TEXT NOT NULL DEFAULT '';

UPDATE role_permissions SET label = CASE role
  WHEN 'sys_admin'  THEN 'מנהל מערכת'
  WHEN 'hr'         THEN 'כוח אדם'
  WHEN 'rsfp'       THEN 'רס"פ'
  WHEN 'commander'  THEN 'מ"כ / קצין'
  WHEN 'viewer'     THEN 'צופה'
  ELSE role
END;
