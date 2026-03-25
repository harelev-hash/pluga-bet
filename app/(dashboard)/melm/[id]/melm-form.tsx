'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Department, EquipmentType, MelmRequest } from '@/lib/types/database'
import { Save, X, Plus, Trash2 } from 'lucide-react'

interface Props {
  request: MelmRequest | null
  departments: Department[]
  equipTypes: EquipmentType[]
  items: any[]
  isNew: boolean
}

export default function MelmForm({ request, departments, equipTypes, items: initialItems, isNew }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: request?.title ?? '',
    department_id: request?.department_id?.toString() ?? '',
    status: request?.status ?? 'open',
    notes: request?.notes ?? '',
  })

  const [items, setItems] = useState<{ type_id: string; quantity_requested: string; notes: string }[]>(
    initialItems.length > 0
      ? initialItems.map((i: any) => ({
          type_id: i.type_id?.toString() ?? '',
          quantity_requested: i.quantity_requested?.toString() ?? '1',
          notes: i.notes ?? '',
        }))
      : [{ type_id: '', quantity_requested: '1', notes: '' }]
  )

  const addItem = () => setItems(it => [...it, { type_id: '', quantity_requested: '1', notes: '' }])
  const removeItem = (idx: number) => setItems(it => it.filter((_, i) => i !== idx))
  const updateItem = (idx: number, field: string, value: string) =>
    setItems(it => it.map((item, i) => i === idx ? { ...item, [field]: value } : item))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const supabase = createClient()

    const payload = {
      ...form,
      department_id: form.department_id ? parseInt(form.department_id) : null,
    }

    startTransition(async () => {
      let requestId: number
      if (isNew) {
        const { data, error } = await supabase.from('melm_requests').insert(payload).select().single()
        if (error) { setError(error.message); return }
        requestId = data.id
      } else {
        const { error } = await supabase.from('melm_requests').update(payload).eq('id', request!.id)
        if (error) { setError(error.message); return }
        requestId = request!.id
        // Delete existing items and re-insert
        await supabase.from('melm_items').delete().eq('request_id', requestId)
      }

      const validItems = items.filter(i => i.type_id)
      if (validItems.length > 0) {
        const itemPayloads = validItems.map(i => ({
          request_id: requestId,
          type_id: parseInt(i.type_id),
          quantity_requested: parseInt(i.quantity_requested) || 1,
          notes: i.notes || null,
        }))
        const { error } = await supabase.from('melm_items').insert(itemPayloads)
        if (error) { setError(error.message); return }
      }

      if (isNew) {
        router.push(`/melm/${requestId}`)
      }
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <X className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* Request details */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 space-y-4">
        <h2 className="font-semibold text-slate-700">פרטי הבקשה</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-600 mb-1">כותרת</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="input" placeholder="תיאור קצר של הבקשה" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">מחלקה</label>
            <select value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))} className="input">
              <option value="">— כל הפלוגה —</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          {!isNew && (
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">סטטוס</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="input">
                <option value="open">פתוח</option>
                <option value="in_progress">בטיפול</option>
                <option value="resolved">טופל</option>
                <option value="closed">סגור</option>
              </select>
            </div>
          )}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-600 mb-1">הערות</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input resize-none h-20" />
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-700">פריטים מבוקשים</h2>
          <button type="button" onClick={addItem} className="flex items-center gap-1 text-blue-600 text-sm hover:text-blue-800 transition-colors">
            <Plus className="w-4 h-4" />הוסף
          </button>
        </div>
        {items.map((item, idx) => (
          <div key={idx} className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select
                value={item.type_id}
                onChange={e => updateItem(idx, 'type_id', e.target.value)}
                className="input"
              >
                <option value="">— בחר ציוד —</option>
                {equipTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <input
                type="number"
                min="1"
                value={item.quantity_requested}
                onChange={e => updateItem(idx, 'quantity_requested', e.target.value)}
                className="input"
                placeholder="כמות"
              />
              <input
                value={item.notes}
                onChange={e => updateItem(idx, 'notes', e.target.value)}
                className="input"
                placeholder="הערה..."
              />
            </div>
            {items.length > 1 && (
              <button type="button" onClick={() => removeItem(idx)} className="text-slate-300 hover:text-red-400 transition-colors mt-2">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={isPending} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
          <Save className="w-4 h-4" />{isPending ? 'שומר...' : 'שמור'}
        </button>
        <button type="button" onClick={() => router.back()} className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm hover:bg-slate-50 transition-colors">
          ביטול
        </button>
      </div>
    </form>
  )
}
