'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, Filter } from 'lucide-react'

interface Check {
  id: number
  is_present: boolean
  soldier_id: number
  soldier: { full_name: string; role_in_unit: string | null } | null
  assignment: {
    id: number; attribute: string | null
    item: { serial_number: string | null; type: { name: string } | null } | null
    type: { name: string } | null
  } | null
}

interface Report {
  id: number
  report_date: string
  created_at: string
  department: { id: number; name: string } | null
  template: { id: number; name: string } | null
  checks: Check[]
}

interface Department { id: number; name: string }

interface Props {
  reports: Report[]
  departments: Department[]
}

const itemLabel = (c: Check) => {
  const name = c.assignment?.item?.type?.name ?? c.assignment?.type?.name ?? '—'
  const serial = c.assignment?.item?.serial_number ? ` #${c.assignment.item.serial_number}` : ''
  const attr = c.assignment?.attribute ? ` (${c.assignment.attribute})` : ''
  return `${name}${serial}${attr}`
}

const formatDate = (d: string) =>
  new Date(d + 'T12:00:00').toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })

export default function GreenEyesHistory({ reports, departments }: Props) {
  const [filterDept, setFilterDept] = useState<string>('')
  const [filterDate, setFilterDate] = useState<string>('')
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const toggle = (id: number) =>
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const filtered = useMemo(() => reports.filter(r => {
    if (filterDept && String(r.department?.id) !== filterDept) return false
    if (filterDate && r.report_date !== filterDate) return false
    return true
  }), [reports, filterDept, filterDate])

  // Per report: group checks by soldier
  const bySoldier = (checks: Check[]) => {
    const map = new Map<number, { name: string; role: string | null; present: Check[]; missing: Check[] }>()
    checks.forEach(c => {
      if (!map.has(c.soldier_id)) {
        map.set(c.soldier_id, { name: c.soldier?.full_name ?? '—', role: c.soldier?.role_in_unit ?? null, present: [], missing: [] })
      }
      const entry = map.get(c.soldier_id)!
      c.is_present ? entry.present.push(c) : entry.missing.push(c)
    })
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'he'))
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={filterDept}
            onChange={e => setFilterDept(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
          >
            <option value="">כל המחלקות</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <input
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
          />
          {(filterDept || filterDate) && (
            <button
              onClick={() => { setFilterDept(''); setFilterDate('') }}
              className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 transition-colors"
            >
              נקה
            </button>
          )}
          <span className="text-xs text-slate-400 mr-auto">{filtered.length} דוחות</span>
        </div>
      </div>

      {/* Reports list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 py-16 text-center">
          <p className="text-slate-400 text-sm">לא נמצאו דוחות</p>
        </div>
      ) : (
        filtered.map(report => {
          const soldiers = bySoldier(report.checks)
          const totalItems = report.checks.length
          const presentItems = report.checks.filter(c => c.is_present).length
          const allOk = soldiers.every(s => s.missing.length === 0)
          const isOpen = expanded.has(report.id)

          return (
            <div key={report.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              {/* Header row */}
              <button
                onClick={() => toggle(report.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-right"
              >
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${allOk ? 'bg-green-500' : 'bg-amber-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm">
                    {formatDate(report.report_date)}
                    {report.department && <span className="text-slate-500 font-normal mr-2">— {report.department.name}</span>}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {report.template ? `תבנית: ${report.template.name} · ` : ''}
                    {soldiers.length} חיילים · {presentItems}/{totalItems} פריטים
                    {!allOk && <span className="text-amber-500"> · {soldiers.filter(s => s.missing.length > 0).length} לא תקינים</span>}
                  </p>
                </div>
                {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
              </button>

              {/* Expanded detail */}
              {isOpen && (
                <div className="border-t border-slate-100">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-slate-400">חייל</th>
                        <th className="px-4 py-2 text-center text-xs font-semibold text-slate-400 w-16">סטטוס</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-slate-400">קיים</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-slate-400">חסר</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {soldiers.map((s, i) => (
                        <tr key={i} className={s.missing.length === 0 ? 'bg-green-50/40' : ''}>
                          <td className="px-4 py-2.5 font-medium text-slate-800">
                            {s.name}
                            {s.role && <span className="text-slate-400 font-normal text-xs mr-1">— {s.role}</span>}
                          </td>
                          <td className="px-4 py-2.5 text-center text-xs">
                            {s.missing.length === 0
                              ? <span className="text-green-600 font-medium">✓</span>
                              : <span className="text-amber-600 font-medium">{s.present.length}/{s.present.length + s.missing.length}</span>}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-green-700">
                            {s.present.length ? s.present.map(itemLabel).join(', ') : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-red-600">
                            {s.missing.length ? s.missing.map(itemLabel).join(', ') : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
