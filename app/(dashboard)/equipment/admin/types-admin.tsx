'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { EquipmentType, EquipmentOwnership } from '@/lib/types/database'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'

const OWNERSHIP_LABELS: Record<EquipmentOwnership, string> = {
  personal: 'אישי',
  platoon:  'פלוגתי',
  battalion:'גדודי',
}
const OWNERSHIP_COLORS: Record<EquipmentOwnership, string> = {
  personal:  'bg-purple-100 text-purple-700',
  platoon:   'bg-blue-100 text-blue-700',
  battalion: 'bg-amber-100 text-amber-700',
}

interface Props { types: EquipmentType[] }

const EMPTY: Omit<EquipmentType, 'id'> = {
  category: '',
  name: '',
  is_serialized: false,
  unit: 'יח\'',
  description: null,
  ownership: 'platoon',
}

export default function TypesAdmin({ types }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<number | null>(null)
  const [form, setForm] = useState<Omit<EquipmentType, 'id'>>(EMPTY)
  const [error, setError] = useState('')

  const categories = [...new Set(types.map(t => t.category))]

  const startAdd = () => {
    setAdding(true)
    setEditing(null)
    setForm(EMPTY)
    setError('')
  }

  const startEdit = (t: EquipmentType) => {
    setEditing(t.id)
    setAdding(false)
    setForm({ category: t.category, name: t.name, is_serialized: t.is_serialized, unit: t.unit, description: t.description, ownership: t.ownership })
    setError('')
  }

  const cancel = () => { setAdding(false); setEditing(null); setError('') }

  const save = () => {
    if (!form.category.trim() || !form.name.trim()) { setError('קטגוריה ושם הם שדות חובה'); return }
    setError('')
    startTransition(async () => {
      const supabase = createClient()
      if (editing !== null) {
        const { error } = await supabase.from('equipment_types').update(form).eq('id', editing)
        if (error) { setError(error.message); return }
      } else {
        const { error } = await supabase.from('equipment_types').insert(form)
        if (error) { setError(error.message); return }
      }
      cancel()
      router.refresh()
    })
  }

  const remove = (id: number, name: string) => {
    if (!confirm(`למחוק את סוג הציוד "${name}"?`)) return
    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase.from('equipment_types').delete().eq('id', id)
      if (error) setError(error.message)
      else router.refresh()
    })
  }

  const byCategory = categories.map(cat => ({
    cat,
    items: types.filter(t => t.category === cat),
  }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{types.length} סוגי ציוד ב-{categories.length} קטגוריות</p>
        <button
          onClick={startAdd}
          className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> סוג חדש
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <FormRow
          form={form}
          setForm={setForm}
          categories={categories}
          onSave={save}
          onCancel={cancel}
          isPending={isPending}
          error={error}
        />
      )}

      {/* Table by category */}
      {byCategory.map(({ cat, items }) => (
        <div key={cat} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
            <h3 className="font-semibold text-slate-700 text-sm">{cat}</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100">
              <tr>
                <th className="px-4 py-2 text-right font-medium text-slate-500">שם</th>
                <th className="px-4 py-2 text-right font-medium text-slate-500">בעלות</th>
                <th className="px-4 py-2 text-right font-medium text-slate-500">יחידה</th>
                <th className="px-4 py-2 text-right font-medium text-slate-500">מסודר</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.map(t => (
                editing === t.id ? (
                  <tr key={t.id}>
                    <td colSpan={5} className="px-4 py-3">
                      <FormRow
                        form={form}
                        setForm={setForm}
                        categories={categories}
                        onSave={save}
                        onCancel={cancel}
                        isPending={isPending}
                        error={error}
                        inline
                      />
                    </td>
                  </tr>
                ) : (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-800">{t.name}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${OWNERSHIP_COLORS[t.ownership]}`}>
                        {OWNERSHIP_LABELS[t.ownership]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">{t.unit ?? '—'}</td>
                    <td className="px-4 py-2.5 text-slate-500">{t.is_serialized ? 'כן' : 'לא'}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => startEdit(t)} className="text-slate-400 hover:text-blue-600 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => remove(t.id, t.name)} className="text-slate-400 hover:text-red-600 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}

function FormRow({
  form, setForm, categories, onSave, onCancel, isPending, error, inline = false,
}: {
  form: Omit<EquipmentType, 'id'>
  setForm: (f: Omit<EquipmentType, 'id'>) => void
  categories: string[]
  onSave: () => void
  onCancel: () => void
  isPending: boolean
  error: string
  inline?: boolean
}) {
  const set = (k: keyof typeof form, v: unknown) => setForm({ ...form, [k]: v })

  const inner = (
    <div className="flex flex-wrap gap-2 items-end">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-500">קטגוריה</label>
        <input
          list="cats"
          value={form.category}
          onChange={e => set('category', e.target.value)}
          placeholder="קטגוריה"
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <datalist id="cats">{categories.map(c => <option key={c} value={c} />)}</datalist>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-500">שם</label>
        <input
          value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder="שם הפריט"
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-500">בעלות</label>
        <select
          value={form.ownership}
          onChange={e => set('ownership', e.target.value as EquipmentOwnership)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="personal">אישי</option>
          <option value="platoon">פלוגתי</option>
          <option value="battalion">גדודי</option>
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-500">יחידה</label>
        <input
          value={form.unit ?? ''}
          onChange={e => set('unit', e.target.value || null)}
          placeholder="יח'"
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-20 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-500">מסודר?</label>
        <select
          value={form.is_serialized ? '1' : '0'}
          onChange={e => set('is_serialized', e.target.value === '1')}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="0">לא</option>
          <option value="1">כן</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onSave}
          disabled={isPending}
          className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          <Check className="w-3.5 h-3.5" /> שמור
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
        >
          <X className="w-3.5 h-3.5" /> ביטול
        </button>
      </div>
      {error && <p className="text-xs text-red-600 w-full">{error}</p>}
    </div>
  )

  if (inline) return inner
  return (
    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
      {inner}
    </div>
  )
}
