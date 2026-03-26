'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, ChevronLeft, ClipboardList, CheckCircle2, Clock, Users, ChevronDown, ChevronUp } from 'lucide-react'

interface EventRow {
  id: number
  name: string
  description: string | null
  event_date: string
  entries: { id: number; status: string }[]
}

interface Props {
  events: EventRow[]
  currentPeriodId: number | null
  activeSoldierIds: number[]
}

export default function TrackingList({ events, currentPeriodId, activeSoldierIds }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '',
    description: '',
    event_date: new Date().toISOString().split('T')[0],
  })
  const [error, setError] = useState<string | null>(null)

  const handleCreate = () => {
    if (!form.name.trim()) return
    setError(null)
    startTransition(async () => {
      const supabase = createClient()

      // 1. Create event
      const { data: event, error: eventErr } = await supabase
        .from('tracking_events')
        .insert({
          name: form.name.trim(),
          description: form.description.trim() || null,
          event_date: form.event_date,
          period_id: currentPeriodId,
        })
        .select('id')
        .single()

      if (eventErr || !event) { setError(eventErr?.message ?? 'שגיאה ביצירת מעקב'); return }

      // 2. Populate entries for all active soldiers
      if (activeSoldierIds.length > 0) {
        await supabase.from('tracking_entries').insert(
          activeSoldierIds.map(soldier_id => ({
            event_id: event.id,
            soldier_id,
            status: 'pending',
          }))
        )
      }

      router.push(`/tracking/${event.id}`)
    })
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })

  return (
    <div className="space-y-4" dir="rtl">
      {/* Create button / form */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <button
          onClick={() => setShowForm(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
        >
          <span className="flex items-center gap-2 font-semibold text-slate-700 text-sm">
            <Plus className="w-4 h-4 text-blue-600" />
            מעקב חדש
          </span>
          {showForm ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {showForm && (
          <div className="border-t border-slate-100 p-4 space-y-3">
            {error && <p className="text-red-600 text-xs">{error}</p>}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">שם המעקב *</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder='למשל: "הגעה לחיול", "חיסון שפעת"'
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-600 mb-1">תאריך</label>
                <input
                  type="date"
                  value={form.event_date}
                  onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-600 mb-1">תיאור (רשות)</label>
                <input
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="פרטים נוספים..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                ייווצרו {activeSoldierIds.length} רשומות (כל החיילים הפעילים)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700"
                >
                  ביטול
                </button>
                <button
                  onClick={handleCreate}
                  disabled={isPending || !form.name.trim()}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {isPending ? 'יוצר...' : 'צור מעקב'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Events list */}
      {events.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 py-16 text-center">
          <ClipboardList className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">אין מעקבים עדיין</p>
          <p className="text-slate-300 text-xs mt-1">צור מעקב חדש להתחלה</p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map(event => {
            const total = event.entries.length
            const done = event.entries.filter(e => e.status === 'done').length
            const exempt = event.entries.filter(e => e.status === 'exempt').length
            const relevant = total - exempt
            const pct = relevant > 0 ? Math.round((done / relevant) * 100) : 0

            return (
              <button
                key={event.id}
                onClick={() => router.push(`/tracking/${event.id}`)}
                className="w-full bg-white rounded-xl shadow-sm border border-slate-100 p-4 hover:border-blue-200 hover:bg-blue-50/30 transition-all text-right"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800">{event.name}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
                      <span>{formatDate(event.event_date)}</span>
                      {event.description && <span className="truncate max-w-xs">{event.description}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-left">
                      <p className="text-sm font-bold text-slate-800">{done}<span className="text-slate-400 font-normal">/{relevant}</span></p>
                      <p className="text-xs text-slate-400">{pct}%</p>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-slate-300" />
                  </div>
                </div>

                {/* Mini progress bar */}
                <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex items-center gap-4 mt-2 text-xs">
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="w-3 h-3" /> {done} ביצעו
                  </span>
                  <span className="flex items-center gap-1 text-amber-500">
                    <Clock className="w-3 h-3" /> {total - done - exempt} ממתינים
                  </span>
                  {exempt > 0 && (
                    <span className="text-slate-400">{exempt} לא רלוונטי</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
