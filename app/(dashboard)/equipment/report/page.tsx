import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import EquipmentReport from './equipment-report'

export default async function EquipmentReportPage() {
  const supabase = await createClient()

  const [{ data: soldiers }, { data: departments }, { data: assignments }, { data: storageLocations }] = await Promise.all([
    supabase
      .from('soldiers')
      .select('id, full_name, rank, role_in_unit, department_id')
      .eq('is_active', true)
      .order('full_name'),
    supabase
      .from('departments')
      .select('id, name, display_order')
      .order('display_order'),
    supabase
      .from('equipment_assignments')
      .select(`
        id, status, attribute, ownership, quantity, condition_in, signed_at, returned_at, notes,
        storage_location_id, storage_soldier_id,
        storage_location:storage_locations(id, name),
        storage_soldier:soldiers!storage_soldier_id(id, full_name),
        soldier:soldiers!soldier_id(id, full_name, rank),
        item:equipment_items(id, serial_number, type:equipment_types(id, name, category)),
        type:equipment_types(id, name, category)
      `)
      .order('signed_at', { ascending: false }),
    supabase.from('storage_locations').select('id, name').eq('is_active', true).order('sort_order'),
  ])

  // Fetch performer names separately (avoids RLS join issues)
  let performerMap: Record<number, string> = {}
  const { data: assignmentPerformers } = await supabase
    .from('equipment_assignments')
    .select('id, performed_by')
  const userIds = [...new Set((assignmentPerformers ?? []).map((a: any) => a.performed_by).filter(Boolean))]
  if (userIds.length > 0) {
    const { data: users } = await supabase.from('app_users').select('id, full_name').in('id', userIds)
    const userNameMap: Record<string, string> = {}
    ;(users ?? []).forEach((u: any) => { userNameMap[u.id] = u.full_name })
    ;(assignmentPerformers ?? []).forEach((a: any) => {
      if (a.performed_by && userNameMap[a.performed_by]) performerMap[a.id] = userNameMap[a.performed_by]
    })
  }

  const assignmentsWithPerformer = (assignments ?? []).map((a: any) => ({
    ...a,
    performer_name: performerMap[a.id] ?? null,
  }))

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/equipment" className="text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">דוח ציוד לפי חייל</h1>
          <p className="text-slate-500 text-sm mt-0.5">בחר חיילים לצפייה בציוד שלהם</p>
        </div>
      </div>

      <EquipmentReport
        soldiers={soldiers ?? []}
        departments={departments ?? []}
        assignments={assignmentsWithPerformer as any}
        storageLocations={storageLocations ?? []}
      />
    </div>
  )
}
