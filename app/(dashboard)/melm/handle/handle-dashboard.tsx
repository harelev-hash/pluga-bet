'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp, ChevronLeft, Check, Clock, X, Lock } from 'lucide-react'

interface MelmItem {
  id: number
  item_kind: string | null
  quantity_requested: number
  notes: string | null
  free_text: string | null
  resap_status: string | null
  resap_notes: string | null
  resap_performed_at: string | null
  performerName: string | null
  soldier: { full_name: string } | null
  type: { name: string } | null
}

interface Request {
  id: number
  title: string | null
  status: string
  created_at: string
  request_date: string | null
  closed_at: string | null
  closedByName: string | null
  department: { id: number; name: string } | null
  items: MelmItem[]
}

interface Props {
  requests: Request[]
  departments: { id: number; name: string }[]
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-orange-100 text-orange-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-slate-100 text-slate-500',
}
const STATUS_LABELS: Record<string, string> = {
  open: 'פתוח', in_progress: 'בטיפול', resolved: 'טופל', closed: 'סגור',
}
const KIND_LABEL: Record<string, string> = {
  wear: 'בלאי', missing_soldier: 'חסר לחייל',
  missing_dept: 'חסר למחלקה', free_text: 'מלל חופשי', equipment: 'ציוד',
}
const RESAP_CONFIG: Record<string, { icon: React.ReactNode; cls: string; label: string }> = {
  supplied:  { icon: <Check className="w-3 h-3" />,  cls: 'text-green-600 bg-green-50',  label: 'סופק' },
  long_term: { icon: <Clock className="w-3 h-3" />,  cls: 'text-amber-600 bg-amber-50',  label: 'טיפול ארוך' },
  rejected:  { icon: <X className="w-3 h-3" />,      cls: 'text-red-500 bg-red-50',      label: 'דחוי' },
  pending:   { icon: null,                            cls: 'text-slate-400 bg-slate-50',  label: 'ממתין' },
}

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

export default function HandleDashboard({ requests, departments }: Props) {
  const [filterDept, setFilterDept] = useState('')
  const [filterStatus, setFilterStatus] = useState('open')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const toggle = (id: number) => setExpanded(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n
  })

  const filtered = useMemo(() => {
    return requests.filter(r => {
      if (filterDept && r.department?.id !== parseInt(filterDept)) return false
      if (filterStatus === 'open' && r.status === 'closed') return false
      if (filterStatus === 'closed' && r.status !== 'closed') return false
      const date = r.request_date ?? r.created_at
      if (filterFrom && date < filterFrom) return false
      if (filterTo && date > filterTo + 'T23:59:59') return false
      return true
    })
  }, [requests, filterDept, filterStatus, filterFrom, filterTo])

  const pendingCount = filtered.filter(r => r.status !== 'closed').length

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1">מחלקה</label>
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="input w-full text-sm">
            <option value="">הכל</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">סטטוס</label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input w-full text-sm">
            <option value="open">פתוחים</option>
            <option value="closed">סגורים</option>
            <option value="all">הכל</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">מתאריך</label>
          <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className="input w-full text-sm" />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">עד תאריך</label>
          <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className="input w-full text-sm" />
        </div>
      </div>

      <p className="text-xs text-slate-400 px-1">
        {filtered.length} בקשות · {pendingCount} ממתינות לטיפול
      </p>

      {filtered.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-100 py-12 text-center text-slate-400 text-sm">
          אין בקשות
        </div>
      )}

      {filtered.map(r => {
        const isOpen = expanded.has(r.id)
        const pendingItems = r.items.filter(i => !i.resap_status || i.resap_status === 'pending').length
        const isClosed = r.status === 'closed'

        return (
          <div key={r.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            {/* Card header */}
            <div
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => toggle(r.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-slate-800">{r.title ?? `בקשה #${r.id}`}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status] ?? ''}`}>
                    {STATUS_LABELS[r.status] ?? r.status}
                  </span>
                  {pendingItems > 0 && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                      {pendingItems} ממתינים
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 flex-wrap">
                  <span>{r.department?.name ?? 'ללא מחלקה'}</span>
                  <span>·</span>
                  <span>{formatDate(r.request_date ?? r.created_at)}</span>
                  <span>·</span>
                  <span>{r.items.length} סעיפים</span>
                  {isClosed && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <Lock className="w-3 h-3" />
                        נסגר{r.closed_at ? ` ${formatDate(r.closed_at)}` : ''}
                        {r.closedByName ? ` ע"י ${r.closedByName}` : ''}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/melm/${r.id}`}
                  onClick={e => e.stopPropagation()}
                  className="flex items-center gap-1 text-xs text-blue-600 font-medium border border-blue-200 hover:bg-blue-50 px-2.5 py-1 rounded-lg transition-colors"
                >
                  פתח לטיפול <ChevronLeft className="w-3.5 h-3.5" />
                </Link>
                {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
            </div>

            {/* Inline item rows */}
            {isOpen && (
              <div className="border-t border-slate-100">
                {r.items.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-4">אין סעיפים</p>
                ) : (
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-slate-50">
                      {r.items.map(item => {
                        const kind = item.item_kind ?? 'equipment'
                        const rc = RESAP_CONFIG[item.resap_status ?? 'pending'] ?? RESAP_CONFIG.pending
                        const desc = kind === 'free_text'
                          ? item.free_text
                          : (kind === 'wear' || kind === 'missing_soldier')
                            ? `${item.soldier?.full_name ?? '—'} — ${item.type?.name ?? item.free_text ?? '—'}`
                            : (item.type?.name ?? item.free_text ?? '—')

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-2 text-xs text-slate-400 w-24 shrink-0">
                              {KIND_LABEL[kind] ?? kind}
                            </td>
                            <td className="px-4 py-2 text-slate-700">
                              {desc}
                              {item.quantity_requested > 1 && (
                                <span className="text-slate-400 text-xs mr-1">×{item.quantity_requested}</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-xs text-slate-400 max-w-[100px] truncate">
                              {item.notes ?? ''}
                            </td>
                            <td className="px-4 py-2">
                              <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full w-fit ${rc.cls}`}>
                                {rc.icon} {rc.label}
                              </span>
                            </td>
                            {/* Performer attribution */}
                            <td className="px-4 py-2 text-xs text-slate-400 max-w-[140px]">
                              {item.performerName && item.resap_status !== 'pending' && (
                                <span title={item.resap_performed_at ? formatDate(item.resap_performed_at) : ''}>
                                  ע&quot;י {item.performerName}
                                  {item.resap_performed_at && (
                                    <span className="text-slate-300 mr-1">· {formatDate(item.resap_performed_at)}</span>
                                  )}
                                </span>
                              )}
                              {item.resap_notes && (
                                <span className="block text-slate-300 truncate">{item.resap_notes}</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
