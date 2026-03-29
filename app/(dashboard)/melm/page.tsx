import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ClipboardList, Wrench, BarChart2, ChevronLeft } from 'lucide-react'
import { formatDate, MELM_STATUS_LABELS } from '@/lib/utils'

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-orange-100 text-orange-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-slate-100 text-slate-500',
}

export default async function MelmPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('melm_requests')
    .select('id, title, status, created_at, request_date, department:departments(name)')
    .order('created_at', { ascending: false })

  if (status === 'closed') query = query.eq('status', 'closed')
  else if (status === 'all') { /* no filter */ }
  else query = query.neq('status', 'closed')

  const { data: requests } = await query

  const openCount = (requests ?? []).filter((r: any) => r.status === 'open' || r.status === 'in_progress').length

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

      {/* Status filter */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-3">
        <div className="flex flex-wrap gap-2">
          {[
            { value: '', label: 'פתוחים' },
            { value: 'all', label: 'הכל' },
            { value: 'closed', label: 'סגור' },
          ].map(opt => (
            <Link
              key={opt.value}
              href={opt.value ? `/melm?status=${opt.value}` : '/melm'}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                (status ?? '') === opt.value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {opt.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Requests list */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 divide-y divide-slate-50">
        {requests && requests.length > 0 ? requests.map((r: any) => (
          <Link
            key={r.id}
            href={`/melm/${r.id}`}
            className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-medium text-slate-800">{r.title ?? `בקשה #${r.id}`}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status] ?? ''}`}>
                  {MELM_STATUS_LABELS[r.status as keyof typeof MELM_STATUS_LABELS] ?? r.status}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>{(r.department as any)?.name ?? 'ללא מחלקה'}</span>
                <span>·</span>
                <span>{formatDate(r.request_date ?? r.created_at)}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-blue-600 font-medium shrink-0">
              <span>כנס לטיפול</span>
              <ChevronLeft className="w-4 h-4" />
            </div>
          </Link>
        )) : (
          <p className="px-4 py-10 text-center text-slate-400">אין בקשות מל&quot;מ</p>
        )}
      </div>

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
