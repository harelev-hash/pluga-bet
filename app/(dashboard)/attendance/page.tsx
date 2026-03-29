import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/auth/server'
import { todayISO, formatDate } from '@/lib/utils'
import AttendanceGrid from './attendance-grid'

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; dept?: string }>
}) {
  await requirePermission('nav:attendance')
  const { date: dateParam, dept } = await searchParams
  const date = dateParam ?? todayISO()
  const supabase = await createClient()

  const [{ data: departments }, { data: soldiers }, { data: period }, { data: existing }] =
    await Promise.all([
      supabase.from('departments').select('*').order('display_order'),
      (() => {
        let q = supabase
          .from('soldiers')
          .select('id, full_name, rank, department_id, department:departments(id,name)')
          .eq('is_active', true)
          .order('full_name')
        if (dept) q = q.eq('department_id', parseInt(dept))
        return q
      })(),
      supabase.from('reserve_periods').select('*').eq('is_current', true).single(),
      supabase.from('daily_attendance').select('*').eq('date', date),
    ])

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">נוכחות יומית</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {period ? period.name : 'ללא סבב פעיל'} · {formatDate(date)}
          </p>
        </div>
      </div>

      {/* Date + dept filter */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
        <form className="flex flex-wrap gap-3">
          <input
            type="date"
            name="date"
            defaultValue={date}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            name="dept"
            defaultValue={dept ?? ''}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">כל המחלקות</option>
            {departments?.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            טען
          </button>
        </form>
      </div>

      <AttendanceGrid
        soldiers={soldiers ?? []}
        date={date}
        periodId={period?.id ?? null}
        existing={existing ?? []}
      />
    </div>
  )
}
