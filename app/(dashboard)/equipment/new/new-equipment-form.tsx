'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { EquipmentType } from '@/lib/types/database'
import { Save, X } from 'lucide-react'

export default function NewEquipmentForm({ types }: { types: EquipmentType[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    type_id: '',
    serial_number: '',
    quantity: '1',
    condition: 'serviceable',
    location: '',
    notes: '',
  })

  const selectedType = types.find(t => t.id === parseInt(form.type_id))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const supabase = createClient()
    const payload: any = {
      type_id: parseInt(form.type_id),
      condition: form.condition,
      location: form.location || null,
      notes: form.notes || null,
    }
    if (selectedType?.is_serialized) {
      payload.serial_number = form.serial_number
    } else {
      payload.quantity = parseInt(form.quantity) || 1
    }
    startTransition(async () => {
      const { data, error } = await supabase.from('equipment_items').insert(payload).select().single()
      if (error) { setError(error.message); return }
      router.push(`/equipment/${data.id}`)
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
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-600 mb-1">סוג ציוד *</label>
          <select value={form.type_id} onChange={e => setForm(f => ({ ...f, type_id: e.target.value }))} className="input" required>
            <option value="">— בחר סוג —</option>
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
            <input value={form.serial_number} onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))} className="input font-mono" placeholder="מס'" />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">כמות</label>
            <input type="number" min="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} className="input" />
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
