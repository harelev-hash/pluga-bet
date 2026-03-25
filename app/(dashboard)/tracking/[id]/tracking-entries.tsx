'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDateTime } from '@/lib/utils'
import { Plus, X, CheckCircle2, XCircle } from 'lucide-react'
import type { TrackingEntry } from '@/lib/types/database'

interface Props {
  eventId: number
  entries: (TrackingEntry & { soldier?: { id: number; full_name: string; rank: string } | null })[]
}

export default function TrackingEntries({ eventId, entries: initial }: Props) {
  const [entries, setEntries] = useState(initial)
  const [isPending, startTransition] = useTransition()
  const [newNote, setNewNote] = useState('')
  const [newStatus, setNewStatus] = useState<'open' | 'resolved' | 'in_progress'>('open')

  const addEntry = () => {
    if (!newNote.trim()) return
    startTransition(async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('tracking_entries')
        .insert({ event_id: eventId, note: newNote.trim(), status: newStatus })
        .select('*, soldier:soldiers(id,full_name,rank)')
        .single()
      if (!error && data) {
        setEntries(e => [data, ...e])
        setNewNote('')
      }
    })
  }

  const toggleStatus = (entry: any) => {
    const next = entry.status === 'resolved' ? 'open' : 'resolved'
    startTransition(async () => {
      const supabase = createClient()
      await supabase.from('tracking_entries').update({ status: next }).eq('id', entry.id)
      setEntries(e => e.map(x => x.id === entry.id ? { ...x, status: next } : x))
    })
  }

  const deleteEntry = (id: number) => {
    startTransition(async () => {
      const supabase = createClient()
      await supabase.from('tracking_entries').delete().eq('id', id)
      setEntries(e => e.filter(x => x.id !== id))
    })
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100">
      <div className="p-4 border-b border-slate-100">
        <h2 className="font-semibold text-slate-700">עדכונים ורשומות</h2>
      </div>

      {/* Add entry */}
      <div className="p-4 border-b border-slate-100 space-y-2">
        <textarea
          value={newNote}
          onChange={e => setNewNote(e.target.value)}
          placeholder="הוסף עדכון..."
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex items-center gap-2">
          <select
            value={newStatus}
            onChange={e => setNewStatus(e.target.value as any)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
          >
            <option value="open">פתוח</option>
            <option value="in_progress">בטיפול</option>
            <option value="resolved">טופל</option>
          </select>
          <button
            onClick={addEntry}
            disabled={isPending || !newNote.trim()}
            className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            הוסף
          </button>
        </div>
      </div>

      {/* Entries list */}
      <div className="divide-y divide-slate-50">
        {entries.length === 0 ? (
          <p className="px-4 py-8 text-center text-slate-400 text-sm">אין עדכונים עדיין</p>
        ) : entries.map(entry => (
          <div key={entry.id} className="p-4 flex items-start gap-3">
            <button onClick={() => toggleStatus(entry)} className="mt-0.5 shrink-0">
              {entry.status === 'resolved'
                ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                : <XCircle className="w-5 h-5 text-slate-300 hover:text-slate-400" />}
            </button>
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${entry.status === 'resolved' ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                {entry.note}
              </p>
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                <span>{formatDateTime(entry.created_at)}</span>
                {entry.status === 'in_progress' && (
                  <span className="bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">בטיפול</span>
                )}
              </div>
            </div>
            <button
              onClick={() => deleteEntry(entry.id)}
              className="text-slate-300 hover:text-red-400 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
