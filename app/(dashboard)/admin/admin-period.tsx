'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import type { ReservePeriod } from '@/lib/types/database'
import { Plus, Check } from 'lucide-react'

export default function AdminPeriod({ periods }: { periods: ReservePeriod[] }) {
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [localPeriods, setLocalPeriods] = useState(periods)

  const addPeriod = () => {
    if (!name || !startDate) return
    startTransition(async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('reserve_periods')
        .insert({ name, start_date: startDate, end_date: endDate || null, is_current: false })
        .select()
        .single()
      if (!error && data) {
        setLocalPeriods(p => [data, ...p])
        setName('')
        setStartDate('')
        setEndDate('')
      }
    })
  }

  const setCurrent = (id: number) => {
    startTransition(async () => {
      const supabase = createClient()
      await supabase.from('reserve_periods').update({ is_current: false }).neq('id', id)
      await supabase.from('reserve_periods').update({ is_current: true }).eq('id', id)
      setLocalPeriods(p => p.map(x => ({ ...x, is_current: x.id === id })))
    })
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100">
      <div className="p-4 border-b border-slate-100">
        <h2 className="font-semibold text-slate-700">סבבי מילואים</h2>
      </div>
      <div className="p-4 space-y-4">
        {/* Add new period */}
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">שם סבב</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="סבב 8 - 2026"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">מתאריך</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">עד תאריך</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={addPeriod}
            disabled={isPending || !name || !startDate}
            className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Plus className="w-4 h-4" />הוסף
          </button>
        </div>

        {/* Period list */}
        <div className="divide-y divide-slate-50 border border-slate-100 rounded-lg overflow-hidden">
          {localPeriods.map(p => (
            <div key={p.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <span className="font-medium text-slate-800 text-sm">{p.name}</span>
                <span className="text-xs text-slate-400 mr-2">
                  {formatDate(p.start_date)}{p.end_date ? ` – ${formatDate(p.end_date)}` : ''}
                </span>
                {p.is_current && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">פעיל</span>
                )}
              </div>
              {!p.is_current && (
                <button
                  onClick={() => setCurrent(p.id)}
                  disabled={isPending}
                  className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                >
                  הגדר כפעיל
                </button>
              )}
            </div>
          ))}
          {localPeriods.length === 0 && (
            <p className="px-4 py-6 text-center text-slate-400 text-sm">אין סבבים</p>
          )}
        </div>
      </div>
    </div>
  )
}
