'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { EquipmentItem, EquipmentType } from '@/lib/types/database'
import { Save, X } from 'lucide-react'

interface Props {
  item: EquipmentItem & { type?: EquipmentType | null }
  types: EquipmentType[]
}

export default function EquipmentForm({ item, types }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    type_id: item.type_id?.toString() ?? '',
    serial_number: item.serial_number ?? '',
    quantity: item.quantity?.toString() ?? '1',
    condition: item.condition ?? 'serviceable',
    location: item.location ?? '',
    notes: item.notes ?? '',
  })

  const selectedType = types.find(t => t.id === parseInt(form.type_id))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const supabase = createClient()
    const payload = {
      ...form,
      type_id: parseInt(form.type_id),
      quantity: parseInt(form.quantity) || 1,
    }
    startTransition(async () => {
      const { error } = await supabase.from('equipment_items').update(payload).eq('id', item.id)
      if (error) { setError(error.message); return }
      router.refresh()
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
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">סוג ציוד</label>
          <select value={form.type_id} onChange={e => setForm(f => ({ ...f, type_id: e.target.value }))} className="input">
            <option value="">— בחר —</option>
            {types.map(t => <option key={t.id} value={t.id}>{t.name} ({t.category})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">מצב</label>
          <select value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))} className="input">
            <option value="serviceable">תקין</option>
            <option value="needs_repair">טעון תיקון</option>
            <option value="unserviceable">לא תקין</option>
          </select>
        </div>
        {selectedType?.is_serialized ? (
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">מספר סידורי</label>
            <input value={form.serial_number} onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))} className="input font-mono" />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">כמות</label>
            <input type="number" min="0" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} className="input" />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">מיקום</label>
          <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className="input" placeholder="מחסן, מחלקה..." />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-600 mb-1">הערות</label>
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input resize-none h-20" />
        </div>
      </div>
      <button type="submit" disabled={isPending} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
        <Save className="w-4 h-4" />{isPending ? 'שומר...' : 'שמור'}
      </button>
    </form>
  )
}
