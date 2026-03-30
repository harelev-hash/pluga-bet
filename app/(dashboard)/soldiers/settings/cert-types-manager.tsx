'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, ChevronUp, ChevronDown, Eye, EyeOff } from 'lucide-react'

type CertType = { id: number; name: string; display_order: number; is_active: boolean }

export default function CertTypesManager({ initial }: { initial: CertType[] }) {
  const [types, setTypes] = useState(initial)
  const [newName, setNewName] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const reload = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('certification_types')
      .select('*')
      .order('display_order')
      .order('name')
    setTypes(data ?? [])
  }

  const handleAdd = () => {
    if (!newName.trim()) return
    setError(null)
    startTransition(async () => {
      const supabase = createClient()
      const maxOrder = Math.max(0, ...types.map(t => t.display_order))
      const { error } = await supabase
        .from('certification_types')
        .insert({ name: newName.trim(), display_order: maxOrder + 1 })
      if (error) { setError(error.message); return }
      setNewName('')
      await reload()
    })
  }

  const handleToggleActive = (id: number, current: boolean) => {
    startTransition(async () => {
      const supabase = createClient()
      await supabase.from('certification_types').update({ is_active: !current }).eq('id', id)
      await reload()
    })
  }

  const handleDelete = (id: number, name: string) => {
    if (!confirm(`למחוק את ההסמכה "${name}"?\nזה לא יסיר אותה מחיילים שכבר קיבלו אותה.`)) return
    startTransition(async () => {
      const supabase = createClient()
      await supabase.from('certification_types').delete().eq('id', id)
      await reload()
    })
  }

  const handleMove = (id: number, direction: 'up' | 'down') => {
    const idx = types.findIndex(t => t.id === id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= types.length) return
    const a = types[idx], b = types[swapIdx]
    startTransition(async () => {
      const supabase = createClient()
      await Promise.all([
        supabase.from('certification_types').update({ display_order: b.display_order }).eq('id', a.id),
        supabase.from('certification_types').update({ display_order: a.display_order }).eq('id', b.id),
      ])
      await reload()
    })
  }

  return (
    <div className="space-y-3" dir="rtl">
      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="space-y-1.5">
        {types.map((t, i) => (
          <div
            key={t.id}
            className={`flex items-center gap-2 p-2.5 rounded-lg border transition-opacity ${
              t.is_active
                ? 'border-slate-200 bg-white'
                : 'border-dashed border-slate-200 bg-slate-50 opacity-50'
            }`}
          >
            {/* Reorder */}
            <div className="flex flex-col">
              <button
                onClick={() => handleMove(t.id, 'up')}
                disabled={i === 0 || isPending}
                className="text-slate-300 hover:text-slate-600 disabled:opacity-20"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleMove(t.id, 'down')}
                disabled={i === types.length - 1 || isPending}
                className="text-slate-300 hover:text-slate-600 disabled:opacity-20"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            <span className="flex-1 text-sm font-medium text-slate-700">{t.name}</span>

            {!t.is_active && (
              <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">מוסתר</span>
            )}

            <button
              onClick={() => handleToggleActive(t.id, t.is_active)}
              disabled={isPending}
              title={t.is_active ? 'הסתר מהטפסים' : 'הצג בטפסים'}
              className="text-slate-400 hover:text-slate-600"
            >
              {t.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>

            <button
              onClick={() => handleDelete(t.id, t.name)}
              disabled={isPending}
              title="מחק"
              className="text-slate-300 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {types.length === 0 && (
        <p className="text-slate-400 text-sm text-center py-4">אין הסמכות. הוסף למטה.</p>
      )}

      {/* Add new */}
      <div className="flex gap-2 pt-3 border-t border-slate-100">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="שם הסמכה חדשה..."
          className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleAdd}
          disabled={!newName.trim() || isPending}
          className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          הוסף
        </button>
      </div>
    </div>
  )
}
