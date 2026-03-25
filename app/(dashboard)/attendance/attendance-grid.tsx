'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AttendanceStatus, DailyAttendance, Soldier } from '@/lib/types/database'
import { Check, Save } from 'lucide-react'

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; color: string }[] = [
  { value: 'present', label: 'נוכח', color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'absent', label: 'נעדר', color: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'sick', label: 'חולה', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { value: 'approved_absence', label: 'היעדרות מאושרת', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'vacation', label: 'חופשה', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'weekend', label: 'שבת/חג', color: 'bg-gray-100 text-gray-600 border-gray-200' },
]

interface Props {
  soldiers: (Soldier & { department?: { id: number; name: string } | null })[]
  date: string
  periodId: number | null
  existing: DailyAttendance[]
}

export default function AttendanceGrid({ soldiers, date, periodId, existing }: Props) {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  const initMap = () => {
    const m: Record<number, AttendanceStatus> = {}
    existing.forEach(r => { m[r.soldier_id] = r.status as AttendanceStatus })
    return m
  }

  const [statuses, setStatuses] = useState<Record<number, AttendanceStatus>>(initMap)
  const [notes, setNotes] = useState<Record<number, string>>(() => {
    const m: Record<number, string> = {}
    existing.forEach(r => { if (r.notes) m[r.soldier_id] = r.notes })
    return m
  })

  const setStatus = (soldierId: number, status: AttendanceStatus) => {
    setStatuses(s => ({ ...s, [soldierId]: status }))
    setSaved(false)
  }

  const handleSave = () => {
    setSaved(false)
    startTransition(async () => {
      const supabase = createClient()
      const upserts = soldiers.map(s => ({
        soldier_id: s.id,
        date,
        period_id: periodId,
        status: statuses[s.id] ?? 'present',
        notes: notes[s.id] ?? null,
      }))
      await supabase
        .from('daily_attendance')
        .upsert(upserts, { onConflict: 'soldier_id,date' })
      setSaved(true)
    })
  }

  if (soldiers.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 py-16 text-center">
        <p className="text-slate-400">לא נמצאו חיילים</p>
      </div>
    )
  }

  const presentCount = soldiers.filter(s => (statuses[s.id] ?? 'present') === 'present').length

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex items-center justify-between">
        <div className="flex gap-6 text-sm">
          <span className="text-green-700 font-medium">נוכחים: {presentCount}</span>
          <span className="text-red-600">נעדרים: {soldiers.length - presentCount}</span>
          <span className="text-slate-500">סה"כ: {soldiers.length}</span>
        </div>
        <button
          onClick={handleSave}
          disabled={isPending}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {isPending ? 'שומר...' : saved ? 'נשמר' : 'שמור'}
        </button>
      </div>

      {/* Mobile */}
      <div className="lg:hidden space-y-2">
        {soldiers.map(s => (
          <div key={s.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="font-medium text-slate-800">{s.full_name}</span>
                <span className="text-xs text-slate-400 mr-2">{s.department?.name ?? ''}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setStatus(s.id, opt.value)}
                  className={`px-2 py-1 rounded-lg text-xs border transition-all ${
                    (statuses[s.id] ?? 'present') === opt.value
                      ? opt.color + ' font-semibold'
                      : 'bg-white text-slate-500 border-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <input
              value={notes[s.id] ?? ''}
              onChange={e => setNotes(n => ({ ...n, [s.id]: e.target.value }))}
              placeholder="הערה..."
              className="mt-2 w-full text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none"
            />
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">שם</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">מחלקה</th>
              {STATUS_OPTIONS.map(o => (
                <th key={o.value} className="px-3 py-3 text-center text-xs font-semibold text-slate-500">{o.label}</th>
              ))}
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">הערה</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {soldiers.map(s => (
              <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-800 text-sm">{s.full_name}</td>
                <td className="px-4 py-3 text-sm text-slate-500">{s.department?.name ?? '—'}</td>
                {STATUS_OPTIONS.map(opt => (
                  <td key={opt.value} className="px-3 py-3 text-center">
                    <button
                      onClick={() => setStatus(s.id, opt.value)}
                      className={`w-6 h-6 rounded-full border-2 mx-auto flex items-center justify-center transition-all ${
                        (statuses[s.id] ?? 'present') === opt.value
                          ? opt.color + ' border-current'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      {(statuses[s.id] ?? 'present') === opt.value && (
                        <Check className="w-3 h-3" />
                      )}
                    </button>
                  </td>
                ))}
                <td className="px-4 py-3">
                  <input
                    value={notes[s.id] ?? ''}
                    onChange={e => setNotes(n => ({ ...n, [s.id]: e.target.value }))}
                    placeholder="הערה..."
                    className="w-full text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
