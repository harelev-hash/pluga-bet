import { createClient } from '@/lib/supabase/server'
import { todayISO, formatDate } from '@/lib/utils'
import OpsGrid from './ops-grid'

export default async function OpsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const { date: dateParam } = await searchParams
  const date = dateParam ?? todayISO()
  const supabase = await createClient()

  const [{ data: posts }, { data: soldiers }, { data: assignments }] = await Promise.all([
    supabase.from('guard_posts').select('*').eq('is_active', true).order('name'),
    supabase
      .from('soldiers')
      .select('id, full_name, rank, certifications, department_id, department:departments(id,name)')
      .eq('is_active', true)
      .order('full_name'),
    supabase.from('operational_assignments').select('*').eq('date', date),
  ])

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">שיבוץ יומי</h1>
          <p className="text-slate-500 text-sm mt-0.5">{formatDate(date)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
        <form className="flex gap-3">
          <input
            type="date"
            name="date"
            defaultValue={date}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            טען
          </button>
        </form>
      </div>

      <OpsGrid
        posts={posts ?? []}
        soldiers={soldiers ?? []}
        date={date}
        assignments={assignments ?? []}
      />
    </div>
  )
}
