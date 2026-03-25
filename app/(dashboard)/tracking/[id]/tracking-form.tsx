'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Department, TrackingEvent } from '@/lib/types/database'
import { Save, X } from 'lucide-react'

interface Props {
  event: TrackingEvent | null
  departments: Department[]
  isNew: boolean
}

export default function TrackingForm({ event, departments, isNew }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: event?.title ?? '',
    description: event?.description ?? '',
    event_date: event?.event_date ?? new Date().toISOString().split('T')[0],
    department_id: event?.department_id?.toString() ?? '',
    is_closed: event?.is_closed ?? false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const supabase = createClient()
    const payload = {
      ...form,
      department_id: form.department_id ? parseInt(form.department_id) : null,
    }

    startTransition(async () => {
      if (isNew) {
        const { data, error } = await supabase.from('tracking_events').insert(payload).select().single()
        if (error) { setError(error.message); return }
        router.push(`/tracking/${data.id}`)
        router.refresh()
      } else {
        const { error } = await supabase.from('tracking_events').update(payload).eq('id', event!.id)
        if (error) { setError(error.message); return }
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <X className="w-4 h-4 shrink-0" />{error}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-600 mb-1">כותרת *</label>
          <input
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            required
            className="input"
            placeholder="תיאור האירוע"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">תאריך</label>
          <input
            type="date"
            value={form.event_date}
            onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))}
            className="input"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">מחלקה</label>
          <select
            value={form.department_id}
            onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}
            className="input"
          >
            <option value="">— כל הפלוגה —</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-600 mb-1">תיאור</label>
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className="input resize-none h-20"
            placeholder="פירוט האירוע..."
          />
        </div>
        {!isNew && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_closed}
              onChange={e => setForm(f => ({ ...f, is_closed: e.target.checked }))}
              className="w-4 h-4 accent-blue-600"
            />
            <span className="text-sm text-slate-700">סגור מעקב</span>
          </label>
        )}
      </div>
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Save className="w-4 h-4" />
          {isPending ? 'שומר...' : 'שמור'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm hover:bg-slate-50 transition-colors"
        >
          ביטול
        </button>
      </div>
    </form>
  )
}
