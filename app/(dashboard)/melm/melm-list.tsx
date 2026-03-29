'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ChevronLeft, Lock, Eye, Pencil } from 'lucide-react'

interface Request {
  id: number
  title: string | null
  status: string
  created_at: string
  request_date: string | null
  closed_at: string | null
  closedByName: string | null
  department: { id: number; name: string } | null
  itemCount: number
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

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

export default function MelmList({ requests, departments }: Props) {
  // Default: show open (non-closed)
  const [filterStatus, setFilterStatus] = useState<'open' | 'closed' | 'all'>('open')
  const [filterDept, setFilterDept] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')

  const filtered = useMemo(() => {
    return requests.filter(r => {
      if (filterStatus === 'open' && r.status === 'closed') return false
      if (filterStatus === 'closed' && r.status !== 'closed') return false
      if (filterDept && r.department?.id !== parseInt(filterDept)) return false
      const date = r.request_date ?? r.created_at
      if (filterFrom && date < filterFrom) return false
      if (filterTo && date > filterTo + 'T23:59:59') return false
      return true
    })
  }, [requests, filterStatus, filterDept, filterFrom, filterTo])

  return (
    <div className="space-y-3">
      {/* Filters row */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-3 space-y-3">
        {/* Status tabs — ordered: הכל (right) | פתוחים | סגורים */}
        <div className="flex gap-2">
          {([
            { value: 'all',    label: 'הכל' },
            { value: 'open',   label: 'פתוחים' },
            { value: 'closed', label: 'סגורים' },
          ] as const).map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilterStatus(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                filterStatus === opt.value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Dept + date filters */}
        <div className="grid grid-cols-3 gap-2">
          <select
            value={filterDept}
            onChange={e => setFilterDept(e.target.value)}
            className="input text-sm"
          >
            <option value="">כל המחלקות</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <input
            type="date"
            value={filterFrom}
            onChange={e => setFilterFrom(e.target.value)}
            className="input text-sm"
            placeholder="מתאריך"
          />
          <input
            type="date"
            value={filterTo}
            onChange={e => setFilterTo(e.target.value)}
            className="input text-sm"
            placeholder="עד תאריך"
          />
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 divide-y divide-slate-50">
        {filtered.length > 0 ? filtered.map(r => (
          <div key={r.id} className="p-4 hover:bg-slate-50/50 transition-colors">
            {/* Top row: title + status */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="font-medium text-slate-800">{r.title ?? `בקשה #${r.id}`}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status] ?? ''}`}>
                    {STATUS_LABELS[r.status] ?? r.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                  <span>{r.department?.name ?? 'ללא מחלקה'}</span>
                  <span>·</span>
                  <span>{formatDate(r.request_date ?? r.created_at)}</span>
                  <span>·</span>
                  <span>{r.itemCount} סעיפים</span>
                  {r.status === 'closed' && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        נסגר{r.closed_at ? ` ${formatDate(r.closed_at)}` : ''}
                        {r.closedByName ? ` ע"י ${r.closedByName}` : ''}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Action buttons row */}
            <div className="flex items-center gap-2 mt-2.5">
              <Link
                href={`/melm/${r.id}/view`}
                className="flex items-center gap-1.5 text-xs text-slate-600 border border-slate-200 hover:bg-slate-100 px-2.5 py-1 rounded-lg transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                צפה במל&quot;מ
              </Link>
              {r.status !== 'closed' && (
                <Link
                  href={`/melm/${r.id}/edit`}
                  className="flex items-center gap-1.5 text-xs text-blue-600 border border-blue-200 hover:bg-blue-50 px-2.5 py-1 rounded-lg transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  ערוך בקשה
                </Link>
              )}
              <Link
                href={`/melm/${r.id}`}
                className="flex items-center gap-1 text-xs text-emerald-700 font-medium border border-emerald-200 hover:bg-emerald-50 px-2.5 py-1 rounded-lg transition-colors mr-auto"
              >
                כנס לטיפול <ChevronLeft className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )) : (
          <p className="px-4 py-10 text-center text-slate-400 text-sm">אין בקשות מל&quot;מ</p>
        )}
      </div>
    </div>
  )
}
