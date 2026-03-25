export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type UserRole = 'sys_admin' | 'hr' | 'rsfp' | 'commander' | 'viewer'
export type AttendanceStatus = 'present' | 'absent' | 'sick' | 'approved_absence' | 'vacation' | 'excused' | 'weekend'
export type TrackingEntryStatus = 'open' | 'in_progress' | 'resolved'
export type EquipmentCondition = 'serviceable' | 'needs_repair' | 'unserviceable'
export type EquipmentAction = 'assign' | 'return' | 'transfer' | 'lost' | 'found' | 'condition_update'
export type MelmStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type MelmItemStatus = 'pending' | 'fulfilled' | 'partial' | 'rejected'

export interface Department {
  id: number
  name: string
  display_order: number
  created_at: string
}

export interface AppUser {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  department_id: number | null
  is_active: boolean
  created_at: string
  updated_at: string
  // joined
  department?: Department
}

export interface Soldier {
  id: number
  id_number: string
  full_name: string
  rank: string
  department_id: number | null
  role_in_unit: string | null
  personal_phone: string | null
  emergency_contact: string | null
  home_address: string | null
  city: string | null
  certifications: string[]
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
  // joined
  department?: Department | null
}

export interface ReservePeriod {
  id: number
  name: string
  start_date: string
  end_date: string | null
  is_current: boolean
  created_at: string
}

export interface DailyAttendance {
  id: number
  soldier_id: number
  period_id: number | null
  date: string
  status: AttendanceStatus
  notes: string | null
  recorded_by: string | null
  recorded_at: string
  // joined
  soldier?: Soldier
}

export interface TrackingEvent {
  id: number
  title: string
  description: string | null
  event_date: string
  department_id: number | null
  created_by: string | null
  is_closed: boolean
  created_at: string
  // joined
  department?: Department | null
  entries?: TrackingEntry[]
}

export interface TrackingEntry {
  id: number
  event_id: number
  note: string
  status: TrackingEntryStatus
  created_by: string | null
  created_at: string
  // joined (optional soldier reference)
  soldier?: { id: number; full_name: string; rank: string } | null
}

export interface EquipmentType {
  id: number
  category: string
  name: string
  is_serialized: boolean
  unit: string | null
  description: string | null
}

export interface EquipmentItem {
  id: number
  type_id: number
  serial_number: string | null
  quantity: number
  condition: EquipmentCondition
  location: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // joined
  type?: EquipmentType | null
}

export interface SoldierEquipment {
  id: number
  soldier_id: number
  type_id: number
  quantity: number
  updated_by: string | null
  updated_at: string
  // joined
  type?: EquipmentType
  soldier?: Soldier
}

export interface EquipmentTransaction {
  id: number
  item_id: number | null
  type_id: number | null
  soldier_id: number | null
  action: EquipmentAction
  quantity: number
  performed_by: string | null
  action_date: string
  notes: string | null
  created_at: string
  // joined
  item?: EquipmentItem
  type?: EquipmentType
  soldier?: Soldier
}

export interface MelmRequest {
  id: number
  title: string | null
  department_id: number | null
  status: MelmStatus
  notes: string | null
  submitted_by: string | null
  created_at: string
  updated_at: string
  // joined
  department?: Department | null
  items?: MelmItem[]
}

export interface MelmItem {
  id: number
  request_id: number
  type_id: number | null
  quantity_requested: number
  quantity_fulfilled: number
  status: MelmItemStatus
  notes: string | null
  updated_at: string
  // joined
  type?: EquipmentType | null
}

export interface GuardPost {
  id: number
  name: string
  required_certification: string | null
  min_soldiers: number | null
  is_active: boolean
  notes: string | null
}

export interface OperationalAssignment {
  id: number
  date: string
  shift: string | null
  post_id: number
  soldier_id: number
  assigned_by: string | null
  created_at: string
  notes: string | null
  // joined
  post?: GuardPost
  soldier?: Soldier
}

export interface OperationalSummary {
  id: number
  title: string
  activity_type: string | null
  activity_date: string
  content: string
  key_points: string[]
  department_id: number | null
  submitted_by: string | null
  created_at: string
  // joined
  department?: Department | null
}

type R = []

// Database type for Supabase client
export interface Database {
  public: {
    Tables: {
      departments: { Row: Department; Insert: Omit<Department, 'id' | 'created_at'>; Update: Partial<Omit<Department, 'id' | 'created_at'>>; Relationships: R }
      app_users: { Row: AppUser; Insert: Omit<AppUser, 'created_at' | 'updated_at'>; Update: Partial<Omit<AppUser, 'id' | 'created_at'>>; Relationships: R }
      soldiers: { Row: Soldier; Insert: Omit<Soldier, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<Soldier, 'id' | 'created_at'>>; Relationships: R }
      reserve_periods: { Row: ReservePeriod; Insert: Omit<ReservePeriod, 'id' | 'created_at'>; Update: Partial<Omit<ReservePeriod, 'id' | 'created_at'>>; Relationships: R }
      daily_attendance: { Row: DailyAttendance; Insert: Omit<DailyAttendance, 'id' | 'recorded_at'>; Update: Partial<Omit<DailyAttendance, 'id'>>; Relationships: R }
      tracking_events: { Row: TrackingEvent; Insert: Omit<TrackingEvent, 'id' | 'created_at'>; Update: Partial<Omit<TrackingEvent, 'id' | 'created_at'>>; Relationships: R }
      tracking_entries: { Row: TrackingEntry; Insert: Omit<TrackingEntry, 'id' | 'created_at'>; Update: Partial<Omit<TrackingEntry, 'id'>>; Relationships: R }
      equipment_types: { Row: EquipmentType; Insert: Omit<EquipmentType, 'id'>; Update: Partial<Omit<EquipmentType, 'id'>>; Relationships: R }
      equipment_items: { Row: EquipmentItem; Insert: Omit<EquipmentItem, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<EquipmentItem, 'id' | 'created_at'>>; Relationships: R }
      soldier_equipment: { Row: SoldierEquipment; Insert: Omit<SoldierEquipment, 'id'>; Update: Partial<Omit<SoldierEquipment, 'id'>>; Relationships: R }
      equipment_transactions: { Row: EquipmentTransaction; Insert: Omit<EquipmentTransaction, 'id' | 'action_date' | 'created_at'>; Update: Partial<Omit<EquipmentTransaction, 'id'>>; Relationships: R }
      melm_requests: { Row: MelmRequest; Insert: Omit<MelmRequest, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<MelmRequest, 'id' | 'created_at'>>; Relationships: R }
      melm_items: { Row: MelmItem; Insert: Omit<MelmItem, 'id'>; Update: Partial<Omit<MelmItem, 'id'>>; Relationships: R }
      guard_posts: { Row: GuardPost; Insert: Omit<GuardPost, 'id'>; Update: Partial<Omit<GuardPost, 'id'>>; Relationships: R }
      operational_assignments: { Row: OperationalAssignment; Insert: Omit<OperationalAssignment, 'id' | 'created_at'>; Update: Partial<Omit<OperationalAssignment, 'id' | 'created_at'>>; Relationships: R }
      operational_summaries: { Row: OperationalSummary; Insert: Omit<OperationalSummary, 'id' | 'created_at'>; Update: Partial<Omit<OperationalSummary, 'id' | 'created_at'>>; Relationships: R }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
