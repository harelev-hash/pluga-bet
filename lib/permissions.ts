export interface PermissionItem {
  key: string
  label: string
  group: string
}

// Master list of all permission keys in the system
export const PERMISSION_ITEMS: PermissionItem[] = [
  // Navigation
  { key: 'nav:soldiers',   label: 'כוח אדם',          group: 'ניווט' },
  { key: 'nav:attendance', label: 'נוכחות',            group: 'ניווט' },
  { key: 'nav:tracking',   label: 'מעקבים',            group: 'ניווט' },
  { key: 'nav:equipment',  label: 'ציוד',              group: 'ניווט' },
  { key: 'nav:melm',       label: 'מל"מ',              group: 'ניווט' },
  { key: 'nav:ops',        label: 'מבצעי',             group: 'ניווט' },
  { key: 'nav:admin',      label: 'ניהול (מנהל בלבד)', group: 'ניווט' },

  // Soldiers
  { key: 'soldiers:edit',   label: 'עריכת חיילים',    group: 'כוח אדם' },
  { key: 'soldiers:delete', label: 'מחיקת חיילים',    group: 'כוח אדם' },

  // Attendance
  { key: 'attendance:edit', label: 'עריכת נוכחות',    group: 'נוכחות' },

  // Tracking
  { key: 'tracking:edit',   label: 'עריכת מעקבים',    group: 'מעקבים' },

  // Equipment
  { key: 'equipment:sign',         label: 'חתימת ציוד לחייל',     group: 'ציוד' },
  { key: 'equipment:reception',    label: 'קבלת ציוד (אישור)',     group: 'ציוד' },
  { key: 'equipment:report',       label: 'דוח ציוד לפי חייל',    group: 'ציוד' },
  { key: 'equipment:green_eyes',   label: 'ירוק בעיניים',          group: 'ציוד' },
  { key: 'equipment:storage_edit', label: 'שינוי מקום אפסון',      group: 'ציוד' },
  { key: 'equipment:inventory',    label: 'מלאי ציוד',             group: 'ציוד' },
  { key: 'equipment:import',       label: 'ייבוא ציוד',            group: 'ציוד' },
  { key: 'equipment:admin',        label: 'ניהול ציוד (סוגים/תבניות/אפסון)', group: 'ציוד' },

  // MELM
  { key: 'melm:view',   label: 'צפייה בבקשות מל"מ',   group: 'מל"מ' },
  { key: 'melm:create', label: 'יצירת בקשת מל"מ',     group: 'מל"מ' },
  { key: 'melm:resap',  label: 'עדכון סטטוס רספ',      group: 'מל"מ' },
  { key: 'melm:close',  label: 'סגירת בקשת מל"מ',     group: 'מל"מ' },

  // Ops
  { key: 'ops:edit', label: 'עריכת נתונים מבצעיים', group: 'מבצעי' },

  // Admin
  { key: 'admin:users',       label: 'ניהול משתמשים',   group: 'ניהול' },
  { key: 'admin:periods',     label: 'ניהול תקופות',    group: 'ניהול' },
  { key: 'admin:permissions', label: 'ניהול הרשאות',    group: 'ניהול' },
]

export const PERMISSION_GROUPS = [...new Set(PERMISSION_ITEMS.map(p => p.group))]

// Defaults used as fallback when DB has no record for a role
export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  sys_admin: ['*'],
  hr:        ['nav:soldiers', 'nav:attendance', 'nav:tracking', 'nav:equipment', 'nav:melm', 'soldiers:edit', 'attendance:edit', 'tracking:edit', 'equipment:report', 'equipment:green_eyes', 'melm:view', 'melm:create'],
  rsfp:      ['nav:equipment', 'nav:melm', 'equipment:sign', 'equipment:reception', 'equipment:report', 'equipment:green_eyes', 'equipment:inventory', 'equipment:import', 'equipment:admin', 'equipment:storage_edit', 'melm:view', 'melm:create', 'melm:resap', 'melm:close'],
  commander: ['nav:equipment', 'nav:tracking', 'nav:ops', 'equipment:report', 'equipment:green_eyes', 'equipment:storage_edit', 'tracking:edit', 'ops:edit', 'melm:view'],
  viewer:    ['nav:soldiers', 'nav:attendance', 'nav:tracking', 'nav:equipment', 'nav:melm', 'nav:ops', 'equipment:report', 'equipment:green_eyes', 'melm:view'],
}

export function hasPermission(permissions: string[], key: string): boolean {
  return permissions.includes('*') || permissions.includes(key)
}
