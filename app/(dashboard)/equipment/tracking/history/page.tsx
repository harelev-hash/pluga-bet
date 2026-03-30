import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/auth/server'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import TrackingHistory from './history-client'

export const dynamic = 'force-dynamic'

export default async function TrackingHistoryPage() {
  await requirePermission('equipment:green_eyes')
  const supabase = await createClient()

  const [{ data: reports }, { data: templates }] = await Promise.all([
    supabase
      .from('equipment_tracking_reports')
      .select(`
        id, report_date, created_at, template_ids, performed_by,
        checks:equipment_tracking_checks(
          id, is_present, assignment_id,
          snapshot_soldier_name, snapshot_storage_name,
          assignment:equipment_assignments(
            id, attribute, quantity,
            item:equipment_items(serial_number, type:equipment_types(name)),
            type:equipment_types(name)
          )
        )
      `)
      .order('report_date', { ascending: false }),
    supabase.from('equipment_templates').select('id, name'),
  ])

  // Resolve performer names via app_users
  let performerMap: Record<number, string> = {}
  const { data: reportPerformers } = await supabase
    .from('equipment_tracking_reports')
    .select('id, performed_by')
  const userIds = [...new Set((reportPerformers ?? []).map((r: any) => r.performed_by).filter(Boolean))]
  if (userIds.length > 0) {
    const { data: users } = await supabase.from('app_users').select('id, full_name').in('id', userIds)
    const userNameMap: Record<string, string> = {}
    ;(users ?? []).forEach((u: any) => { userNameMap[u.id] = u.full_name })
    ;(reportPerformers ?? []).forEach((r: any) => {
      if (r.performed_by && userNameMap[r.performed_by]) performerMap[r.id] = userNameMap[r.performed_by]
    })
  }

  const reportsWithPerformer = (reports ?? []).map((r: any) => ({
    ...r,
    performer: performerMap[r.id] ? { full_name: performerMap[r.id] } : null,
  }))

  // Build template name map
  const templateMap: Record<number, string> = {}
  ;(templates ?? []).forEach((t: any) => { templateMap[t.id] = t.name })

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/equipment/tracking" className="text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">היסטוריית מעקב ציוד</h1>
          <p className="text-slate-500 text-sm mt-0.5">דוחות בדיקה קודמים</p>
        </div>
      </div>

      <TrackingHistory reports={reportsWithPerformer as any} templateMap={templateMap} />
    </div>
  )
}
