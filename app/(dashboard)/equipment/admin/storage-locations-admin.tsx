'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, GripVertical } from 'lucide-react'

interface StorageLocation {
  id: number
  name: string
  is_active: boolean
  sort_order: number
}

export default function StorageLocationsAdmin({ locations: initial }: { locations: StorageLocation[] }) {
  const [locations, setLocations] = useState(initial)
  const [newName, setNewName] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const add = () => {
    const name = newName.trim()
    if (!name) return
    setError(null)
    startTransition(async () => {
      const supabase = createClient()
      const maxOrder = locations.reduce((m, l) => Math.max(m, l.sort_order), 0)
      const { data, error: err } = await supabase
        .from('storage_locations')
        .insert({ name, sort_order: maxOrder + 1 })
        .select().single()
      if (err || !data) { setError(err?.message ?? 'שגיאה'); return }
      setLocations(prev => [...prev, data])
      setNewName('')
    })
  }

  const toggle = (id: number, current: boolean) => {
    startTransition(async () => {
      const supabase = createClient()
      await supabase.from('storage_locations').update({ is_active: !current }).eq('id', id)
      setLocations(prev => prev.map(l => l.id === id ? { ...l, is_active: !current } : l))
    })
  }

  const remove = (id: number) => {
    setError(null)
    startTransition(async () => {
      const supabase = createClient()
      const { error: err } = await supabase.from('storage_locations').delete().eq('id', id)
      if (err) { setError('לא ניתן למחוק — ייתכן שמשויך לציוד'); return }
      setLocations(prev => prev.filter(l => l.id !== id))
    })
  }

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="font-semibold text-slate-800">מקומות אפסון</h2>
        <p className="text-xs text-slate-400 mt-0.5">מיקומים פיזיים לאחסון ציוד חיילים</p>
      </div>

      <div className="divide-y divide-slate-50">
        {locations.map(loc => (
          <div key={loc.id} className="flex items-center gap-3 px-5 py-3">
            <GripVertical className="w-4 h-4 text-slate-200 shrink-0" />
            <span className={`flex-1 text-sm font-medium ${loc.is_active ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
              {loc.name}
            </span>
            <button
              onClick={() => toggle(loc.id, loc.is_active)}
              className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                loc.is_active
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
              }`}
            >
              {loc.is_active ? 'פעיל' : 'לא פעיל'}
            </button>
            <button
              onClick={() => remove(loc.id)}
              className="p-1 text-slate-200 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {locations.length === 0 && (
          <p className="px-5 py-6 text-sm text-slate-400 text-center">אין מקומות אפסון מוגדרים</p>
        )}
      </div>

      <div className="px-5 py-4 border-t border-slate-100 flex gap-2">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="שם מקום חדש (למשל: בטחונית 4)..."
          className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
        />
        <button
          onClick={add}
          disabled={!newName.trim() || isPending}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> הוסף
        </button>
      </div>
      {error && <p className="px-5 pb-3 text-xs text-red-500">{error}</p>}
    </div>
  )
}
