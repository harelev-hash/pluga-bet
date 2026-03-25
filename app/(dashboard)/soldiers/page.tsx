import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { UserPlus, Upload, Search } from 'lucide-react'
import SoldiersTable from './soldiers-table'

export default async function SoldiersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; dept?: string; active?: string }>
}) {
  const { q, dept, active } = await searchParams
  const supabase = await createClient()

  const [{ data: departments }, { data: soldiers }] = await Promise.all([
    supabase.from('departments').select('*').order('display_order'),
    (() => {
      let query = supabase
        .from('soldiers')
        .select('*, department:departments(id,name)')
        .order('full_name')

      if (q) query = query.ilike('full_name', `%${q}%`)
      if (dept) query = query.eq('department_id', parseInt(dept))
      if (active !== 'all') query = query.eq('is_active', true)

      return query
    })(),
  ])

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">כוח אדם</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {soldiers?.length ?? 0} חיילים
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/soldiers/import"
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Upload className="w-4 h-4" />
            ייבוא אקסל
          </Link>
          <Link
            href="/soldiers/new"
            className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            חייל חדש
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
        <form className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              name="q"
              defaultValue={q}
              placeholder="חיפוש לפי שם..."
              className="w-full pr-9 pl-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
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
          <select
            name="active"
            defaultValue={active ?? ''}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">פעילים בלבד</option>
            <option value="all">כולם</option>
          </select>
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            חפש
          </button>
          {(q || dept || active) && (
            <Link
              href="/soldiers"
              className="bg-slate-100 text-slate-600 px-4 py-2 rounded-lg text-sm hover:bg-slate-200 transition-colors"
            >
              נקה
            </Link>
          )}
        </form>
      </div>

      {/* Table */}
      <SoldiersTable soldiers={soldiers ?? []} />
    </div>
  )
}
