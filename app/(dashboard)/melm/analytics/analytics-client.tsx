'use client'

import { useMemo } from 'react'

interface Request {
  id: number
  status: string
  department_id: number | null
  request_date: string | null
  created_at: string
  department: { name: string } | null
}

interface Item {
  id: number
  request_id: number
  item_kind: string | null
  quantity_requested: number
  resap_status: string | null
  free_text: string | null
  type: { id: number; name: string; category: string } | null
  soldier: { department_id: number | null } | null
}

interface Props { requests: Request[]; items: Item[] }

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-orange-400',
  in_progress: 'bg-yellow-400',
  resolved: 'bg-emerald-400',
  closed: 'bg-slate-300',
}

const STATUS_LABELS: Record<string, string> = {
  open: 'פתוח', in_progress: 'בטיפול', resolved: 'טופל', closed: 'סגור',
}

const KIND_LABELS: Record<string, string> = {
  wear: 'בלאי לחייל',
  missing_soldier: 'ציוד חסר לחייל',
  missing_dept: 'ציוד למחלקה',
  free_text: 'מלל חופשי',
  equipment: 'ציוד (ישן)',
}

const RESAP_COLORS: Record<string, string> = {
  supplied: 'bg-emerald-400',
  long_term: 'bg-amber-400',
  rejected: 'bg-red-400',
  pending: 'bg-slate-200',
}

const RESAP_LABELS: Record<string, string> = {
  supplied: 'סופק', long_term: 'טיפול ארוך', rejected: 'דחוי', pending: 'ממתין',
}

function BarChart({ data, max, colorFn }: {
  data: { label: string; value: number; color?: string }[]
  max: number
  colorFn?: (label: string) => string
}) {
  if (data.length === 0) return <p className="text-slate-400 text-sm">אין נתונים</p>
  return (
    <div className="space-y-1.5">
      {data.map(({ label, value, color }) => (
        <div key={label} className="flex items-center gap-3">
          <div className="w-28 text-xs text-slate-600 text-left truncate shrink-0" title={label}>{label}</div>
          <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${color ?? (colorFn ? colorFn(label) : 'bg-blue-500')}`}
              style={{ width: max > 0 ? `${(value / max) * 100}%` : '0%' }}
            />
          </div>
          <div className="text-xs font-semibold text-slate-700 w-6 text-right shrink-0">{value}</div>
        </div>
      ))}
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 text-center">
      <p className="text-3xl font-bold text-slate-800">{value}</p>
      <p className="text-sm text-slate-500 mt-1">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function AnalyticsClient({ requests, items }: Props) {
  const stats = useMemo(() => {
    // Request status breakdown
    const byStatus: Record<string, number> = {}
    for (const r of requests) {
      byStatus[r.status] = (byStatus[r.status] ?? 0) + 1
    }

    // Item kind breakdown
    const byKind: Record<string, number> = {}
    for (const i of items) {
      const k = i.item_kind ?? 'equipment'
      byKind[k] = (byKind[k] ?? 0) + 1
    }

    // Resap status breakdown
    const byResap: Record<string, number> = {}
    for (const i of items) {
      const s = i.resap_status ?? 'pending'
      byResap[s] = (byResap[s] ?? 0) + 1
    }

    // Top requested equipment types
    const byType: Record<string, { name: string; count: number }> = {}
    for (const i of items) {
      if (i.type) {
        const key = i.type.id.toString()
        byType[key] = byType[key] ?? { name: i.type.name, count: 0 }
        byType[key].count += i.quantity_requested
      }
    }
    const topTypes = Object.values(byType)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Requests by department
    const byDept: Record<string, number> = {}
    for (const r of requests) {
      const name = (r.department as any)?.name ?? 'לא ידוע'
      byDept[name] = (byDept[name] ?? 0) + 1
    }

    // Monthly trend (last 6 months)
    const monthly: Record<string, number> = {}
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthly[key] = 0
    }
    for (const r of requests) {
      const d = new Date(r.request_date ?? r.created_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (key in monthly) monthly[key] = (monthly[key] ?? 0) + 1
    }

    const fulfillmentRate = items.length > 0
      ? Math.round((items.filter(i => i.resap_status === 'supplied').length / items.length) * 100)
      : 0

    return { byStatus, byKind, byResap, topTypes, byDept, monthly, fulfillmentRate }
  }, [requests, items])

  const maxType = Math.max(...stats.topTypes.map(t => t.count), 1)
  const maxDept = Math.max(...Object.values(stats.byDept), 1)
  const maxMonthly = Math.max(...Object.values(stats.monthly), 1)

  const monthlyData = Object.entries(stats.monthly).map(([key, count]) => {
    const [year, month] = key.split('-')
    const label = new Date(parseInt(year), parseInt(month) - 1, 1)
      .toLocaleDateString('he-IL', { month: 'short', year: '2-digit' })
    return { label, value: count }
  })

  return (
    <div className="space-y-5">
      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="סה״כ בקשות" value={requests.length} />
        <StatCard label="סה״כ סעיפים" value={items.length} />
        <StatCard label="בקשות פתוחות" value={(stats.byStatus.open ?? 0) + (stats.byStatus.in_progress ?? 0)} />
        <StatCard label="אחוז אספקה" value={`${stats.fulfillmentRate}%`} sub="מסה״כ הסעיפים" />
      </div>

      {/* Status breakdown + Kind breakdown */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">סטטוס בקשות</h3>
          <BarChart
            data={Object.entries(stats.byStatus).map(([s, c]) => ({
              label: STATUS_LABELS[s] ?? s,
              value: c,
              color: STATUS_COLORS[s],
            }))}
            max={Math.max(...Object.values(stats.byStatus), 1)}
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">סוגי סעיפים</h3>
          <BarChart
            data={Object.entries(stats.byKind).map(([k, c]) => ({
              label: KIND_LABELS[k] ?? k,
              value: c,
              color: 'bg-blue-400',
            }))}
            max={Math.max(...Object.values(stats.byKind), 1)}
          />
        </div>
      </div>

      {/* Resap status breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">תוצאות טיפול רספ (לפי סעיפים)</h3>
        <BarChart
          data={Object.entries(stats.byResap).map(([s, c]) => ({
            label: RESAP_LABELS[s] ?? s,
            value: c,
            color: RESAP_COLORS[s],
          }))}
          max={Math.max(...Object.values(stats.byResap), 1)}
        />
      </div>

      {/* Top equipment types */}
      {stats.topTypes.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">פריטים שהוזמנו הכי הרבה (כמות)</h3>
          <BarChart
            data={stats.topTypes.map(t => ({ label: t.name, value: t.count, color: 'bg-purple-400' }))}
            max={maxType}
          />
        </div>
      )}

      {/* Department breakdown */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">בקשות לפי מחלקה</h3>
          <BarChart
            data={Object.entries(stats.byDept).map(([d, c]) => ({ label: d, value: c, color: 'bg-emerald-400' }))}
            max={maxDept}
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">בקשות לפי חודש (6 חודשים אחרונים)</h3>
          <BarChart
            data={monthlyData.map(d => ({ ...d, color: 'bg-blue-400' }))}
            max={maxMonthly}
          />
        </div>
      </div>
    </div>
  )
}
