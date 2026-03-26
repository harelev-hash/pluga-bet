'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { EquipmentTemplate, EquipmentType } from '@/lib/types/database'
import { Plus, Trash2, GripVertical, Check, X, ChevronDown, ChevronUp } from 'lucide-react'

interface Props {
  templates: EquipmentTemplate[]
  types: EquipmentType[]
}

export default function TemplatesAdmin({ templates, types }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [expanded, setExpanded] = useState<number | null>(null)
  const [newName, setNewName] = useState('')
  const [error, setError] = useState('')

  const addTemplate = () => {
    if (!newName.trim()) return
    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase.from('equipment_templates').insert({ name: newName.trim() })
      if (error) { setError(error.message); return }
      setNewName('')
      router.refresh()
    })
  }

  const deleteTemplate = (id: number, name: string) => {
    if (!confirm(`למחוק תבנית "${name}"? כל הפריטים שלה יימחקו.`)) return
    startTransition(async () => {
      const supabase = createClient()
      await supabase.from('equipment_templates').delete().eq('id', id)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      {/* Add template */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex items-center gap-3">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTemplate()}
          placeholder="שם תבנית חדשה (למשל: לוחם, מטול, נגב)"
          className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <button
          onClick={addTemplate}
          disabled={isPending || !newName.trim()}
          className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Plus className="w-4 h-4" /> הוסף
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}

      {/* Templates list */}
      {templates.map(tmpl => (
        <TemplateCard
          key={tmpl.id}
          template={tmpl}
          types={types}
          isExpanded={expanded === tmpl.id}
          onToggle={() => setExpanded(expanded === tmpl.id ? null : tmpl.id)}
          onDelete={() => deleteTemplate(tmpl.id, tmpl.name)}
        />
      ))}
    </div>
  )
}

function TemplateCard({
  template, types, isExpanded, onToggle, onDelete,
}: {
  template: EquipmentTemplate
  types: EquipmentType[]
  isExpanded: boolean
  onToggle: () => void
  onDelete: () => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showAdd, setShowAdd] = useState(false)
  const [newTypeId, setNewTypeId] = useState('')
  const [newQty, setNewQty] = useState(1)
  const [newReqAttr, setNewReqAttr] = useState(false)
  const [newAttrOptions, setNewAttrOptions] = useState('')
  const [error, setError] = useState('')

  const items = template.items ?? []
  const usedTypeIds = new Set(items.map(i => i.type_id))
  const availableTypes = types.filter(t => !usedTypeIds.has(t.id))

  const addItem = () => {
    if (!newTypeId) return
    startTransition(async () => {
      const supabase = createClient()
      const opts = newAttrOptions.split(',').map(s => s.trim()).filter(Boolean)
      const { error } = await supabase.from('equipment_template_items').insert({
        template_id: template.id,
        type_id: parseInt(newTypeId),
        default_quantity: newQty,
        requires_attribute: newReqAttr,
        attribute_options: opts,
        sort_order: items.length,
      })
      if (error) { setError(error.message); return }
      setNewTypeId('')
      setNewQty(1)
      setNewReqAttr(false)
      setNewAttrOptions('')
      setShowAdd(false)
      router.refresh()
    })
  }

  const removeItem = (id: number) => {
    startTransition(async () => {
      const supabase = createClient()
      await supabase.from('equipment_template_items').delete().eq('id', id)
      router.refresh()
    })
  }

  const selectedType = newTypeId ? types.find(t => t.id === parseInt(newTypeId)) : null

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          <span className="font-semibold text-slate-800">{template.name}</span>
          <span className="text-xs text-slate-400">{items.length} פריטים</span>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          className="text-slate-300 hover:text-red-500 transition-colors p-1"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {isExpanded && (
        <div className="border-t border-slate-100">
          {/* Items list */}
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-2 text-right font-medium text-slate-500 w-6"></th>
                <th className="px-4 py-2 text-right font-medium text-slate-500">פריט</th>
                <th className="px-4 py-2 text-right font-medium text-slate-500">כמות ברירת מחדל</th>
                <th className="px-4 py-2 text-right font-medium text-slate-500">דורש בחירה</th>
                <th className="px-4 py-2 text-right font-medium text-slate-500">אפשרויות</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items
                .sort((a, b) => a.sort_order - b.sort_order)
                .map(item => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-300"><GripVertical className="w-3.5 h-3.5" /></td>
                    <td className="px-4 py-2 font-medium text-slate-800">{item.type?.name ?? '—'}</td>
                    <td className="px-4 py-2 text-slate-600">{item.default_quantity}</td>
                    <td className="px-4 py-2 text-slate-500">{item.requires_attribute ? 'כן' : 'לא'}</td>
                    <td className="px-4 py-2 text-slate-400 text-xs">
                      {item.attribute_options?.length > 0 ? item.attribute_options.join(', ') : '—'}
                    </td>
                    <td className="px-4 py-2">
                      <button onClick={() => removeItem(item.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>

          {/* Add item */}
          <div className="p-4 border-t border-slate-100">
            {!showAdd ? (
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" /> הוסף פריט לתבנית
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-500">סוג ציוד</label>
                    <select
                      value={newTypeId}
                      onChange={e => setNewTypeId(e.target.value)}
                      className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    >
                      <option value="">בחר סוג...</option>
                      {availableTypes.map(t => (
                        <option key={t.id} value={t.id}>{t.category} — {t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-500">כמות ברירת מחדל</label>
                    <input
                      type="number"
                      min={1}
                      value={newQty}
                      onChange={e => setNewQty(parseInt(e.target.value) || 1)}
                      className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-20 focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-500">דורש בחירת סוג?</label>
                    <select
                      value={newReqAttr ? '1' : '0'}
                      onChange={e => setNewReqAttr(e.target.value === '1')}
                      className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    >
                      <option value="0">לא</option>
                      <option value="1">כן</option>
                    </select>
                  </div>
                  {newReqAttr && (
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-slate-500">אפשרויות (מופרדות בפסיק)</label>
                      <input
                        value={newAttrOptions}
                        onChange={e => setNewAttrOptions(e.target.value)}
                        placeholder="עמרן, מודולארי, מטול"
                        className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-blue-300"
                      />
                    </div>
                  )}
                  {selectedType?.is_serialized && (
                    <p className="text-xs text-amber-600 self-end pb-2">⚠ פריט מסודר — מספר סידורי ייבחר בזמן חתימה</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={addItem}
                    disabled={isPending || !newTypeId}
                    className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" /> הוסף
                  </button>
                  <button
                    onClick={() => { setShowAdd(false); setError('') }}
                    className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" /> ביטול
                  </button>
                </div>
                {error && <p className="text-xs text-red-600">{error}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
