import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import SerialLookupClient from './serial-lookup-client'

export default async function SerialLookupPage() {
  const supabase = await createClient()

  // Fetch all serialized items with ALL assignments (current + history)
  const { data: items } = await supabase
    .from('equipment_items')
    .select(`
      id, serial_number, condition,
      type:equipment_types(id, name, category),
      assignments:equipment_assignments(
        id, status, attribute, signed_at, returned_at, notes,
        soldier:soldiers!soldier_id(full_name, rank)
      )
    `)
    .order('serial_number')

  // Fetch performer names: get performed_by UUIDs, then look up names
  let performerMap: Record<number, string> = {}
  const { data: assignmentPerformers } = await supabase
    .from('equipment_assignments')
    .select('id, performed_by')
  const userIds = [...new Set((assignmentPerformers ?? []).map((a: any) => a.performed_by).filter(Boolean))]
  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from('app_users')
      .select('id, full_name')
      .in('id', userIds)
    const userNameMap: Record<string, string> = {}
    ;(users ?? []).forEach((u: any) => { userNameMap[u.id] = u.full_name })
    ;(assignmentPerformers ?? []).forEach((a: any) => {
      if (a.performed_by && userNameMap[a.performed_by]) {
        performerMap[a.id] = userNameMap[a.performed_by]
      }
    })
  }

  const processed = (items ?? []).map((item: any) => {
    const assignments: any[] = Array.isArray(item.assignments) ? item.assignments : []
    const withPerformer = assignments.map((a: any) => ({
      ...a,
      performer: performerMap[a.id] ? { full_name: performerMap[a.id] } : null,
    }))
    const current = withPerformer.find((a: any) => a.status === 'active' || a.status === 'planned') ?? null
    const history = withPerformer
      .filter((a: any) => a.status !== 'active' && a.status !== 'planned')
      .sort((a: any, b: any) => (b.returned_at ?? b.signed_at ?? '').localeCompare(a.returned_at ?? a.signed_at ?? ''))
    return { ...item, assignment: current, history }
  })

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/equipment" className="text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">מציאת פריט לפי צ&apos;</h1>
          <p className="text-slate-500 text-sm mt-0.5">חיפוש פריטים לפי מספר סידורי</p>
        </div>
      </div>

      <SerialLookupClient items={processed} />
    </div>
  )
}
