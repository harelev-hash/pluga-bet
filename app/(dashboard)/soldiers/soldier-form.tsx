'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { RANK_OPTIONS } from '@/lib/utils'
import type { Department, Soldier } from '@/lib/types/database'
import { Save, Trash2, X, Plus } from 'lucide-react'

interface Props {
  soldier: Soldier | null
  departments: Department[]
  isNew: boolean
  certificationOptions: string[]
}

export default function SoldierForm({ soldier, departments, isNew, certificationOptions }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    id_number: soldier?.id_number ?? '',
    full_name: soldier?.full_name ?? '',
    rank: soldier?.rank ?? 'טוראי',
    department_id: soldier?.department_id?.toString() ?? '',
    role_in_unit: soldier?.role_in_unit ?? '',
    personal_phone: soldier?.personal_phone ?? '',
    emergency_contact: soldier?.emergency_contact ?? '',
    home_address: soldier?.home_address ?? '',
    city: soldier?.city ?? '',
    notes: soldier?.notes ?? '',
    is_active: soldier?.is_active ?? true,
    certifications: soldier?.certifications ?? [],
  })

  const toggleCert = (cert: string) => {
    setForm(f => ({
      ...f,
      certifications: f.certifications.includes(cert)
        ? f.certifications.filter(c => c !== cert)
        : [...f.certifications, cert],
    }))
  }

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
        const { error } = await supabase.from('soldiers').insert(payload)
        if (error) { setError(error.message); return }
      } else {
        const { error } = await supabase.from('soldiers').update(payload).eq('id', soldier!.id)
        if (error) { setError(error.message); return }
      }
      router.push('/soldiers')
      router.refresh()
    })
  }

  const handleDelete = async () => {
    if (!confirm('האם למחוק חייל זה? לא ניתן לשחזר.')) return
    const supabase = createClient()
    await supabase.from('soldiers').update({ is_active: false }).eq('id', soldier!.id)
    router.push('/soldiers')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <X className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Basic info */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <h2 className="font-semibold text-slate-700 mb-4">פרטים בסיסיים</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="שם מלא *" required>
            <input
              value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              required
              className="input"
              placeholder="שם פרטי ושם משפחה"
            />
          </Field>
          <Field label="מספר חייל / ת.ז. *" required>
            <input
              value={form.id_number}
              onChange={e => setForm(f => ({ ...f, id_number: e.target.value }))}
              required
              className="input font-mono"
              placeholder="מספר אישי"
            />
          </Field>
          <Field label="דרגה">
            <select
              value={form.rank}
              onChange={e => setForm(f => ({ ...f, rank: e.target.value }))}
              className="input"
            >
              {RANK_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="מחלקה">
            <select
              value={form.department_id}
              onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}
              className="input"
            >
              <option value="">— ללא —</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
          <Field label="תפקיד ביחידה">
            <input
              value={form.role_in_unit}
              onChange={e => setForm(f => ({ ...f, role_in_unit: e.target.value }))}
              className="input"
              placeholder="לוחם, קמ&quot;ן, נהג..."
            />
          </Field>
        </div>
      </div>

      {/* Contact */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <h2 className="font-semibold text-slate-700 mb-4">פרטי קשר</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="טלפון אישי">
            <input
              value={form.personal_phone}
              onChange={e => setForm(f => ({ ...f, personal_phone: e.target.value }))}
              className="input"
              placeholder="05X-XXXXXXX"
              dir="ltr"
            />
          </Field>
          <Field label="איש קשר לחירום">
            <input
              value={form.emergency_contact}
              onChange={e => setForm(f => ({ ...f, emergency_contact: e.target.value }))}
              className="input"
              placeholder="שם וטלפון"
            />
          </Field>
          <Field label="כתובת מגורים">
            <input
              value={form.home_address}
              onChange={e => setForm(f => ({ ...f, home_address: e.target.value }))}
              className="input"
              placeholder="רחוב ומספר"
            />
          </Field>
          <Field label="עיר">
            <input
              value={form.city}
              onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
              className="input"
            />
          </Field>
        </div>
      </div>

      {/* Certifications */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <h2 className="font-semibold text-slate-700 mb-4">הסמכות</h2>
        <div className="flex flex-wrap gap-2">
          {certificationOptions.map(cert => (
            <button
              key={cert}
              type="button"
              onClick={() => toggleCert(cert)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                form.certifications.includes(cert)
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {form.certifications.includes(cert) ? '✓ ' : ''}{cert}
            </button>
          ))}
        </div>
      </div>

      {/* Notes + Active */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <h2 className="font-semibold text-slate-700 mb-4">נוסף</h2>
        <Field label="הערות">
          <textarea
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            className="input resize-none h-24"
            placeholder="הערות חופשיות..."
          />
        </Field>
        <label className="flex items-center gap-2 mt-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
            className="w-4 h-4 accent-blue-600"
          />
          <span className="text-sm text-slate-700">חייל פעיל</span>
        </label>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            <Save className="w-4 h-4" />
            {isPending ? 'שומר...' : 'שמור'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm hover:bg-slate-50 transition-colors"
          >
            ביטול
          </button>
        </div>
        {!isNew && (
          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center gap-2 text-red-500 hover:text-red-700 text-sm"
          >
            <Trash2 className="w-4 h-4" />
            השבת לא פעיל
          </button>
        )}
      </div>
    </form>
  )
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-1">
        {label}{required && <span className="text-red-500 mr-1">*</span>}
      </label>
      {children}
    </div>
  )
}
