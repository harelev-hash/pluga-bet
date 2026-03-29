import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/auth/server'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import HandleDashboard from './handle-dashboard'

export default async function MelmHandleDashboardPage() {
  await requirePermission('melm:resap')
  const supabase = await createClient()

  const [{ data: requests }, { data: departments }] = await Promise.all([
    supabase
      .from('melm_requests')
      .select(`
        id, title, status, created_at, request_date, closed_by, closed_at,
        department:departments(id, name),
        items:melm_items(
          id, item_kind, quantity_requested, notes, free_text,
          resap_status, resap_notes, resap_performed_by, resap_performed_at,
          soldier:soldiers(full_name),
          type:equipment_types(name)
        )
      `)
      .order('created_at', { ascending: false }),
    supabase.from('departments').select('id, name').order('display_order'),
  ])

  // Collect all user UUIDs from closer + item performers
  const allUuids = new Set<string>()
  for (const r of requests ?? []) {
    if ((r as any).closed_by) allUuids.add((r as any).closed_by)
    for (const item of (r as any).items ?? []) {
      if (item.resap_performed_by) allUuids.add(item.resap_performed_by)
    }
  }

  let userNameMap: Record<string, string> = {}
  if (allUuids.size > 0) {
    const { data: users } = await supabase
      .from('app_users')
      .select('id, full_name')
      .in('id', Array.from(allUuids))
    ;(users ?? []).forEach((u: any) => { userNameMap[u.id] = u.full_name })
  }

  // Merge names into data
  const enrichedRequests = (requests ?? []).map((r: any) => ({
    ...r,
    closedByName: r.closed_by ? (userNameMap[r.closed_by] ?? null) : null,
    items: (r.items ?? []).map((item: any) => ({
      ...item,
      performerName: item.resap_performed_by ? (userNameMap[item.resap_performed_by] ?? null) : null,
    })),
  }))

  return (
    <div className="max-w-4xl mx-auto space-y-5" dir="rtl">
      <div className="flex items-center gap-3">
        <Link href="/melm" className="text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">טיפול במל&quot;מ</h1>
          <p className="text-slate-500 text-sm mt-0.5">סקירה ופתיחת בקשות לטיפול</p>
        </div>
      </div>

      <HandleDashboard
        requests={enrichedRequests}
        departments={departments ?? []}
      />
    </div>
  )
}
