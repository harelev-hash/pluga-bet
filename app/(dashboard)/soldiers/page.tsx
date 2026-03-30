import { createClient } from '@/lib/supabase/server'
import { getPermissions } from '@/lib/auth/server'
import { hasPermission } from '@/lib/permissions'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { UserPlus, Upload, Search, Settings2 } from 'lucide-react'
import SoldiersTable from './soldiers-table'
import SoldiersExport from './soldiers-export'

export const dynamic = 'force-dynamic'

export default async function SoldiersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; dept?: string; active?: string; cert?: string; city?: string }>
}) {
  const permissions = await getPermissions()
  if (!hasPermission(permissions, 'nav:soldiers')) redirect('/')
  const canEdit = hasPermission(permissions, 'soldiers:edit')

  const { q, dept, active, cert, city } = await searchParams
  const supabase = await createClient()

  const [{ data: departments }, { data: certTypes }, soldiersResult] = await Promise.all([
    supabase.from('departments').select('*').order('display_order'),
    supabase.from('certification_types').select('name').eq('is_active', true).order('display_order').order('name'),
    (() => {
      let query = supabase
        .from('soldiers')
        .select('*, department:departments(id,name)')
        .order('full_name')

      if (q) query = query.ilike('full_name', `%${q}%`)
      if (dept) query = query.eq('department_id', parseInt(dept))
      if (active !== 'all') query = query.eq('is_active', true)
      if (cert) query = query.contains('certifications', [cert])
      if (city) query = query.ilike('city', `%${city}%`)

      return query
    })(),
  ])

  const soldiers = soldiersResult.data ?? []
  const hasFilters = !!(q || dept || cert || city || active)

  // Stats: soldier count by department (only when no filters applied)
  const deptCounts: Record<string, number> = {}
  if (!hasFilters) {
    for (const s of soldiers) {
      const name = (s as any).department?.name ?? 'ללא מחלקה'
      deptCounts[name] = (deptCounts[name] ?? 0) + 1
    }
  }
  const deptStats = Object.entries(deptCounts).sort((a, b) => b[1] - a[1])

  // Label for export
  const filterParts: string[] = []
  if (cert) filterParts.push(`הסמכה: ${cert}`)
  if (city) filterParts.push(`עיר: ${city}`)
  if (dept && departments) {
    const deptName = departments.find((d: any) => String(d.id) === dept)?.name
    if (deptName) filterParts.push(deptName)
  }
  const filterLabel = filterParts.length > 0 ? filterParts.join(', ') : undefined

  return (
    <div className="max-w-6xl mx-auto space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">כוח אדם</h1>
          <p className="text-slate-500 text-sm mt-0.5">{soldiers.length} חיילים</p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Link
              href="/soldiers/settings"
              className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 px-3 py-2 rounded-lg text-sm hover:bg-slate-50 transition-colors shadow-sm"
            >
              <Settings2 className="w-4 h-4" />
              הגדרות
            </Link>
          )}
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

      {/* Stats by department (only when unfiltered) */}
      {deptStats.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:hidden">
          {deptStats.slice(0, 4).map(([name, count]) => (
            <div key={name} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
              <p className="text-2xl font-bold text-blue-600">{count}</p>
              <p className="text-xs text-slate-500 mt-1 truncate" title={name}>{name}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 print:hidden">
        <form className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-44">
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
            {departments?.map((d: any) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <select
            name="cert"
            defaultValue={cert ?? ''}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">כל ההסמכות</option>
            {certTypes?.map((c: any) => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
          <input
            name="city"
            defaultValue={city}
            placeholder="עיר..."
            className="w-28 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
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
          {hasFilters && (
            <Link
              href="/soldiers"
              className="bg-slate-100 text-slate-600 px-4 py-2 rounded-lg text-sm hover:bg-slate-200 transition-colors"
            >
              נקה
            </Link>
          )}
        </form>
      </div>

      {/* Results bar + export */}
      {soldiers.length > 0 && (
        <div className="flex items-center justify-between print:hidden">
          <p className="text-sm text-slate-500">
            {soldiers.length} תוצאות{filterLabel ? ` · ${filterLabel}` : ''}
          </p>
          <SoldiersExport soldiers={soldiers} filterLabel={filterLabel} />
        </div>
      )}

      {/* Table */}
      <SoldiersTable soldiers={soldiers} />
    </div>
  )
}
