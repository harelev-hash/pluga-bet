import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
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
    .select('*, department:departments(id,name)')
    .order('created_at', { ascending: false })

  if (status && status !== 'all') query = query.eq('status', status)
  else if (!status) query = query.in('status', ['open', 'in_progress'])

  const { data: requests } = await query

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">מל&quot;מ</h1>
          <p className="text-slate-500 text-sm mt-0.5">מילוי לאחר מבצע</p>
        </div>
        <Link
          href="/melm/new"
          className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          בקשה חדשה
        </Link>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
        <form className="flex gap-2">
          {[
            { value: '', label: 'פתוחים' },
            { value: 'all', label: 'הכל' },
            { value: 'open', label: 'פתוח' },
            { value: 'in_progress', label: 'בטיפול' },
            { value: 'resolved', label: 'טופל' },
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
        </form>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 divide-y divide-slate-50">
        {requests && requests.length > 0 ? requests.map((r: any) => (
          <Link
            key={r.id}
            href={`/melm/${r.id}`}
            className="flex items-start justify-between p-4 hover:bg-slate-50 transition-colors block"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-slate-800">{r.title ?? `בקשה #${r.id}`}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status] ?? ''}`}>
                  {MELM_STATUS_LABELS[r.status as keyof typeof MELM_STATUS_LABELS] ?? r.status}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span>{(r.department as any)?.name ?? 'לא ידוע'}</span>
                <span>· {formatDate(r.created_at)}</span>
                {r.notes && <span className="truncate max-w-xs">· {r.notes}</span>}
              </div>
            </div>
          </Link>
        )) : (
          <p className="px-4 py-10 text-center text-slate-400">אין בקשות מל&quot;מ</p>
        )}
      </div>
    </div>
  )
}
