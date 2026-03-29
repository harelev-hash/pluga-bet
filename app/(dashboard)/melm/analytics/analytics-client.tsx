'use client'

import { useMemo, useState } from 'react'

interface Request {
  id: number
  status: string
  department_id: number | null
  request_date: string | null
  created_at: string
  department: { id: number; name: string } | null
}

interface Item {
  id: number
  request_id: number
  item_kind: string | null
  quantity_requested: number
  resap_status: string | null
  free_text: string | null
  type: { id: number; name: string; category: string } | null
  soldier: { id: number; full_name: string; department_id: number | null; departments: { name: string } | null } | null
}

interface Props { requests: Request[]; items: Item[] }

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-orange-400', in_progress: 'bg-yellow-400', resolved: 'bg-emerald-400', closed: 'bg-slate-300',
}
const STATUS_LABELS: Record<string, string> = {
  open: 'פתוח', in_progress: 'בטיפול', resolved: 'טופל', closed: 'סגור',
}
const KIND_LABELS: Record<string, string> = {
  wear: 'בלאי לחייל', missing_soldier: 'ציוד חסר לחייל',
  missing_dept: 'ציוד למחלקה', free_text: 'מלל חופשי', equipment: 'ציוד (ישן)',
}
const KIND_COLORS: Record<string, string> = {
  wear: 'bg-amber-400', missing_soldier: 'bg-blue-400',
  missing_dept: 'bg-emerald-400', free_text: 'bg-slate-300', equipment: 'bg-blue-300',
}
const RESAP_COLORS: Record<string, string> = {
  supplied: 'bg-emerald-400', long_term: 'bg-amber-400', rejected: 'bg-red-400', pending: 'bg-slate-200',
}
const RESAP_LABELS: Record<string, string> = {
  supplied: 'סופק', long_term: 'טיפול ארוך', rejected: 'דחוי', pending: 'ממתין',
}

function BarChart({ data, max }: {
  data: { label: string; value: number; color?: string }[]
  max: number
}) {
  if (data.length === 0) return <p className="text-slate-400 text-sm">אין נתונים</p>
  return (
    <div className="space-y-1.5">
      {data.map(({ label, value, color }) => (
        <div key={label} className="flex items-center gap-3">
          <div className="w-32 text-xs text-slate-600 truncate shrink-0 text-left" title={label}>{label}</div>
          <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
            <div
              className={`h-full rounded-full ${color ?? 'bg-blue-500'}`}
              style={{ width: max > 0 ? `${Math.max((value / max) * 100, 2)}%` : '0%' }}
            />
          </div>
          <div className="text-xs font-semibold text-slate-700 w-7 text-right shrink-0">{value}</div>
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
  const [selectedType, setSelectedType] = useState<string | null>(null)

  const stats = useMemo(() => {
    // Status breakdown
    const byStatus: Record<string, number> = {}
    for (const r of requests) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1

    // Item kind breakdown
    const byKind: Record<string, number> = {}
    for (const i of items) {
      const k = i.item_kind ?? 'equipment'
      byKind[k] = (byKind[k] ?? 0) + 1
    }

    // Resap outcome breakdown
    const byResap: Record<string, number> = {}
    for (const i of items) {
      const s = i.resap_status ?? 'pending'
      byResap[s] = (byResap[s] ?? 0) + 1
    }

    // Top requested types (by item count)
    const byType: Record<string, { name: string; count: number; qty: number }> = {}
    for (const i of items) {
      if (i.type) {
        const k = i.type.id.toString()
        byType[k] = byType[k] ?? { name: i.type.name, count: 0, qty: 0 }
        byType[k].count += 1
        byType[k].qty += i.quantity_requested
      } else if (i.free_text) {
        const k = `free:${i.free_text}`
        byType[k] = byType[k] ?? { name: i.free_text, count: 0, qty: 0 }
        byType[k].count += 1
        byType[k].qty += i.quantity_requested
      }
    }
    const topTypes = Object.values(byType).sort((a, b) => b.qty - a.qty).slice(0, 10)

    // Requests by department
    const byDept: Record<string, number> = {}
    for (const r of requests) {
      const name = (r.department as any)?.name ?? 'לא ידוע'
      byDept[name] = (byDept[name] ?? 0) + 1
    }

    // Top soldiers requesting items
    const bySoldier: Record<string, { name: string; deptName: string; count: number }> = {}
    for (const i of items) {
      if (i.soldier) {
        const k = i.soldier.id.toString()
        bySoldier[k] = bySoldier[k] ?? {
          name: i.soldier.full_name,
          deptName: (i.soldier.departments as any)?.name ?? '',
          count: 0,
        }
        bySoldier[k].count += i.quantity_requested
      }
    }
    const topSoldiers = Object.values(bySoldier).sort((a, b) => b.count - a.count).slice(0, 10)

    // Dept × item breakdown: for each type, which depts requested it
    const deptItemMatrix: Record<string, Record<string, number>> = {}
    const allDepts = new Set<string>()
    for (const i of items) {
      const typeName = i.type?.name ?? i.free_text ?? null
      if (!typeName) continue
      const req = requests.find(r => r.id === i.request_id)
      const deptName = req ? ((req.department as any)?.name ?? 'לא ידוע') : 'לא ידוע'
      allDepts.add(deptName)
      deptItemMatrix[typeName] = deptItemMatrix[typeName] ?? {}
      deptItemMatrix[typeName][deptName] = (deptItemMatrix[typeName][deptName] ?? 0) + i.quantity_requested
    }
    // Top types with dept breakdown (top 8 by total qty)
    const topTypesDeptBreakdown = Object.entries(deptItemMatrix)
      .map(([name, depts]) => ({ name, total: Object.values(depts).reduce((a, b) => a + b, 0), depts }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)

    // Monthly trend
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

    return { byStatus, byKind, byResap, topTypes, byDept, topSoldiers, topTypesDeptBreakdown, allDepts: Array.from(allDepts).sort(), monthly, fulfillmentRate }
  }, [requests, items])

  const monthlyData = Object.entries(stats.monthly).map(([key, count]) => {
    const [year, month] = key.split('-')
    const label = new Date(parseInt(year), parseInt(month) - 1, 1)
      .toLocaleDateString('he-IL', { month: 'short', year: '2-digit' })
    return { label, value: count }
  })

  // Dept breakdown for a selected type
  const selectedTypeDept = selectedType
    ? stats.topTypesDeptBreakdown.find(t => t.name === selectedType)
    : null

  return (
    <div className="space-y-5">
      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="סה״כ בקשות" value={requests.length} />
        <StatCard label="סה״כ סעיפים" value={items.length} />
        <StatCard label="פתוחות" value={(stats.byStatus.open ?? 0) + (stats.byStatus.in_progress ?? 0) + (stats.byStatus.resolved ?? 0)} />
        <StatCard label="אחוז אספקה" value={`${stats.fulfillmentRate}%`} sub="מסה״כ הסעיפים" />
      </div>

      {/* Top equipment types */}
      {stats.topTypes.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">פריטים שביקשו הכי הרבה</h3>
          <p className="text-xs text-slate-400 mb-3">לפי סך הכמויות המבוקשות</p>
          <BarChart
            data={stats.topTypes.map(t => ({ label: t.name, value: t.qty, color: 'bg-blue-500' }))}
            max={Math.max(...stats.topTypes.map(t => t.qty), 1)}
          />
        </div>
      )}

      {/* Dept × item breakdown */}
      {stats.topTypesDeptBreakdown.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">ביקוש לפי פריט ומחלקה</h3>
          <p className="text-xs text-slate-400 mb-3">לחץ על פריט כדי לראות את פירוט המחלקות</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {stats.topTypesDeptBreakdown.map(t => (
              <button
                key={t.name}
                onClick={() => setSelectedType(selectedType === t.name ? null : t.name)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                  selectedType === t.name
                    ? 'bg-slate-700 text-white border-slate-700'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {t.name} ({t.total})
              </button>
            ))}
          </div>

          {selectedTypeDept && (
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">{selectedTypeDept.name} — לפי מחלקה:</p>
              <BarChart
                data={Object.entries(selectedTypeDept.depts)
                  .sort(([, a], [, b]) => b - a)
                  .map(([dept, qty]) => ({ label: dept, value: qty, color: 'bg-purple-400' }))}
                max={Math.max(...Object.values(selectedTypeDept.depts), 1)}
              />
            </div>
          )}

          {!selectedType && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="text-right py-1.5 pr-2 text-slate-500 font-semibold">פריט</th>
                    {stats.allDepts.map(d => (
                      <th key={d} className="text-center py-1.5 px-2 text-slate-500 font-semibold whitespace-nowrap">{d}</th>
                    ))}
                    <th className="text-center py-1.5 px-2 text-slate-500 font-semibold">סה״כ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {stats.topTypesDeptBreakdown.map(t => (
                    <tr key={t.name} className="hover:bg-slate-50">
                      <td className="py-1.5 pr-2 font-medium text-slate-700 max-w-[120px] truncate">{t.name}</td>
                      {stats.allDepts.map(d => (
                        <td key={d} className="py-1.5 px-2 text-center">
                          {t.depts[d] ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-blue-100 text-blue-700 font-semibold">
                              {t.depts[d]}
                            </span>
                          ) : <span className="text-slate-200">—</span>}
                        </td>
                      ))}
                      <td className="py-1.5 px-2 text-center font-semibold text-slate-600">{t.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Top soldiers */}
      {stats.topSoldiers.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">חיילים עם הכי הרבה בקשות</h3>
          <p className="text-xs text-slate-400 mb-3">לפי כמות פריטים מבוקשים</p>
          <BarChart
            data={stats.topSoldiers.map(s => ({
              label: s.deptName ? `${s.name} (${s.deptName})` : s.name,
              value: s.count,
              color: 'bg-violet-400',
            }))}
            max={Math.max(...stats.topSoldiers.map(s => s.count), 1)}
          />
        </div>
      )}

      {/* Two-column: status + kind */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">סטטוס בקשות</h3>
          <BarChart
            data={Object.entries(stats.byStatus).map(([s, c]) => ({ label: STATUS_LABELS[s] ?? s, value: c, color: STATUS_COLORS[s] }))}
            max={Math.max(...Object.values(stats.byStatus), 1)}
          />
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">סוגי סעיפים</h3>
          <BarChart
            data={Object.entries(stats.byKind).map(([k, c]) => ({ label: KIND_LABELS[k] ?? k, value: c, color: KIND_COLORS[k] }))}
            max={Math.max(...Object.values(stats.byKind), 1)}
          />
        </div>
      </div>

      {/* Two-column: resap outcomes + monthly trend */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">תוצאות טיפול רספ</h3>
          <BarChart
            data={Object.entries(stats.byResap).map(([s, c]) => ({ label: RESAP_LABELS[s] ?? s, value: c, color: RESAP_COLORS[s] }))}
            max={Math.max(...Object.values(stats.byResap), 1)}
          />
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">בקשות לפי חודש</h3>
          <BarChart
            data={monthlyData.map(d => ({ ...d, color: 'bg-blue-400' }))}
            max={Math.max(...monthlyData.map(d => d.value), 1)}
          />
        </div>
      </div>

      {/* Requests by department */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">בקשות לפי מחלקה</h3>
        <BarChart
          data={Object.entries(stats.byDept).sort(([, a], [, b]) => b - a).map(([d, c]) => ({ label: d, value: c, color: 'bg-emerald-400' }))}
          max={Math.max(...Object.values(stats.byDept), 1)}
        />
      </div>
    </div>
  )
}
