import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default async function TrackingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('tracking_events')
    .select('*, department:departments(id,name)')
    .order('event_date', { ascending: false })

  if (status === 'open') query = query.eq('is_closed', false)
  else if (status === 'closed') query = query.eq('is_closed', true)

  const { data: events } = await query

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">מעקבים</h1>
          <p className="text-slate-500 text-sm mt-0.5">{events?.length ?? 0} אירועים</p>
        </div>
        <Link
          href="/tracking/new"
          className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          מעקב חדש
        </Link>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
        <form className="flex gap-3">
          <select
            name="status"
            defaultValue={status ?? ''}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">הכל</option>
            <option value="open">פתוח</option>
            <option value="closed">סגור</option>
          </select>
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            סנן
          </button>
        </form>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 divide-y divide-slate-50">
        {events && events.length > 0 ? events.map(ev => (
          <Link
            key={ev.id}
            href={`/tracking/${ev.id}`}
            className="flex items-start justify-between p-4 hover:bg-slate-50 transition-colors block"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-slate-800">{ev.title}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${ev.is_closed ? 'bg-slate-100 text-slate-500' : 'bg-green-100 text-green-700'}`}>
                  {ev.is_closed ? 'סגור' : 'פתוח'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span>{formatDate(ev.event_date)}</span>
                {ev.department && <span>· {(ev.department as any).name}</span>}
                {ev.description && <span className="truncate max-w-xs">· {ev.description}</span>}
              </div>
            </div>
          </Link>
        )) : (
          <p className="px-4 py-10 text-center text-slate-400">אין מעקבים</p>
        )}
      </div>
    </div>
  )
}
