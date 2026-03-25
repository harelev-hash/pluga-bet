import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { AttendanceStatus, TrackingEntryStatus, MelmItemStatus, UserRole } from './types/database'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  present: 'נוכח',
  absent: 'נעדר',
  sick: 'חולה',
  approved_absence: 'היעדרות מאושרת',
  vacation: 'חופשה',
  excused: 'מוצדק',
  weekend: 'שבת/חג',
}

export const ATTENDANCE_COLORS: Record<AttendanceStatus, string> = {
  present: 'bg-green-100 text-green-800',
  absent: 'bg-red-100 text-red-800',
  sick: 'bg-yellow-100 text-yellow-800',
  approved_absence: 'bg-blue-100 text-blue-800',
  vacation: 'bg-purple-100 text-purple-800',
  excused: 'bg-orange-100 text-orange-800',
  weekend: 'bg-gray-100 text-gray-600',
}

export const TRACKING_ENTRY_STATUS_LABELS: Record<TrackingEntryStatus, string> = {
  open: 'פתוח',
  in_progress: 'בטיפול',
  resolved: 'טופל',
}

export const TRACKING_STATUS_LABELS = TRACKING_ENTRY_STATUS_LABELS

export const MELM_STATUS_LABELS: Record<string, string> = {
  open: 'פתוח',
  in_progress: 'בטיפול',
  closed: 'סגור',
  pending: 'ממתין',
  fulfilled: 'סופק',
  partial: 'סופק חלקית',
  rejected: 'לא ניתן לספק',
}

export const ROLE_LABELS: Record<UserRole, string> = {
  sys_admin: 'מנהל מערכת',
  hr: 'כוח אדם',
  rsfp: 'רס"פ',
  commander: 'מ"כ / קצין',
  viewer: 'צופה',
}

export const RANK_OPTIONS = [
  'טוראי',
  'רב טוראי',
  'סמל',
  'סמל ראשון',
  'רב סמל',
  'רב סמל מתקדם',
  'רב סמל בכיר',
  'סגן',
  'סרן',
  'רב סרן',
  'סגן אלוף',
  'אלוף משנה',
]

export const CERTIFICATION_OPTIONS = [
  'חמ"ל',
  'נהג',
  'פריה"ן',
  'מ"כ',
  'רופא',
  'חובש',
  'לוחם קרוב',
  'מחבל',
  'מקלענאי',
  'מרגמאי',
  'ממ"ג',
  'צלם',
  'פקע"ר',
]
