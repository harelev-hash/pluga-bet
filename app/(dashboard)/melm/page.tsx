import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/auth/server'
import Link from 'next/link'
import { ClipboardList, Wrench, BarChart2, ChevronLeft } from 'lucide-react'
import MelmList from './melm-list'

export default async function MelmPage() {
  await requirePermission('melm:view')
  const supabase = await createClient()

  const [{ data: requests }, { data: departments }] = await Promise.all([
    supabase
      .from('melm_requests')
      .select('id, title, status, created_at, request_date, closed_by, closed_at, department:departments(id, name), items:melm_items(id)')
      .order('created_at', { ascending: false }),
    supabase.from('departments').select('id, name').order('display_order'),
  ])

  // Batch look up closer names
  const closerUuids = [...new Set((requests ?? []).map((r: any) => r.closed_by).filter(Boolean))]
  let closerNameMap: Record<string, string> = {}
  if (closerUuids.length > 0) {
    const { data: users } = await supabase.from('app_users').select('id, full_name').in('id', closerUuids)
    ;(users ?? []).forEach((u: any) => { closerNameMap[u.id] = u.full_name })
  }

  const enrichedRequests = (requests ?? []).map((r: any) => ({
    id: r.id,
    title: r.title,
    status: r.status,
    created_at: r.created_at,
    request_date: r.request_date,
    closed_at: r.closed_at,
    closedByName: r.closed_by ? (closerNameMap[r.closed_by] ?? null) : null,
    department: r.department,
    itemCount: Array.isArray(r.items) ? r.items.length : 0,
  }))

  const openCount = enrichedRequests.filter(r => r.status !== 'closed').length

  return (
    <div className="max-w-4xl mx-auto space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">מל&quot;מ</h1>
        <p className="text-slate-500 text-sm mt-0.5">מילוי לאחר מבצע</p>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-4">
        <Link
          href="/melm/request"
          className="flex flex-col items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl p-8 shadow-sm transition-colors"
        >
          <ClipboardList className="w-10 h-10" />
          <span className="text-xl font-bold">בקשת מל&quot;מ</span>
          <span className="text-blue-200 text-sm text-center">הגשת בקשה חדשה עבור המחלקה</span>
        </Link>

        <Link
          href="/melm/handle"
          className="flex flex-col items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl p-8 shadow-sm transition-colors relative"
        >
          <Wrench className="w-10 h-10" />
          <span className="text-xl font-bold">טיפול במל&quot;מ</span>
          <span className="text-emerald-200 text-sm text-center">טיפול בבקשות פתוחות</span>
          {openCount > 0 && (
            <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
              {openCount}
            </span>
          )}
        </Link>
      </div>

      <MelmList requests={enrichedRequests} departments={departments ?? []} />

      {/* Analytics CTA */}
      <Link
        href="/melm/analytics"
        className="flex items-center justify-between bg-slate-800 hover:bg-slate-900 text-white rounded-2xl p-5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <BarChart2 className="w-6 h-6 text-slate-400" />
          <div>
            <p className="font-semibold">ניתוח היסטוריית מל&quot;מ</p>
            <p className="text-slate-400 text-sm">מגמות, פריטים נפוצים, ניתוח לפי מחלקה</p>
          </div>
        </div>
        <ChevronLeft className="w-5 h-5 text-slate-400" />
      </Link>
    </div>
  )
}
