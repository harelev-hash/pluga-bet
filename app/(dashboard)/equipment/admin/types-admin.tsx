'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { EquipmentType, EquipmentOwnership } from '@/lib/types/database'
import { Plus, Pencil, Trash2, Check, X, ChevronDown, ChevronUp, FolderOpen } from 'lucide-react'

const OWNERSHIP_LABELS: Record<EquipmentOwnership, string> = {
  personal:  'אישי',
  platoon:   'פלוגתי',
  battalion: 'גדודי',
}
const OWNERSHIP_COLORS: Record<EquipmentOwnership, string> = {
  personal:  'bg-purple-100 text-purple-700',
  platoon:   'bg-blue-100 text-blue-700',
  battalion: 'bg-amber-100 text-amber-700',
}

interface Props { types: EquipmentType[] }

export default function TypesAdmin({ types }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [expandedCat, setExpandedCat] = useState<string | null>(null)
  const [editingType, setEditingType] = useState<number | null>(null)
  const [addingToCat, setAddingToCat] = useState<string | null>(null)
  const [renamingCat, setRenamingCat] = useState<string | null>(null)
  const [newCatName, setNewCatName] = useState('')
  const [newItemForm, setNewItemForm] = useState({ name: '', is_serialized: false, unit: 'יח\'', ownership: 'platoon' as EquipmentOwnership })
  const [editForm, setEditForm] = useState<Partial<EquipmentType>>({})
  const [addCatMode, setAddCatMode] = useState(false)
  const [newCatInput, setNewCatInput] = useState('')
  const [error, setError] = useState('')

  const categories = [...new Set(types.map(t => t.category))].sort()

  // ─── Category: rename ───────────────────────────────────────────
  const startRename = (cat: string) => {
    setRenamingCat(cat)
    setNewCatName(cat)
    setError('')
  }

  const saveRename = (oldCat: string) => {
    if (!newCatName.trim() || newCatName.trim() === oldCat) { setRenamingCat(null); return }
    startTransition(async () => {
      const supabase = createClient()
      const ids = types.filter(t => t.category === oldCat).map(t => t.id)
      const { error } = await supabase
        .from('equipment_types')
        .update({ category: newCatName.trim() })
        .in('id', ids)
      if (error) { setError(error.message); return }
      setRenamingCat(null)
      setExpandedCat(newCatName.trim())
      router.refresh()
    })
  }

  // ─── Category: delete ───────────────────────────────────────────
  const deleteCat = (cat: string) => {
    const items = types.filter(t => t.category === cat)
    if (!confirm(`למחוק את הקטגוריה "${cat}" וכל ${items.length} הפריטים שבה?`)) return
    startTransition(async () => {
      const supabase = createClient()
      const ids = items.map(t => t.id)
      const { error } = await supabase.from('equipment_types').delete().in('id', ids)
      if (error) { setError(error.message); return }
      router.refresh()
    })
  }

  // ─── Category: add new ──────────────────────────────────────────
  const addCategory = () => {
    if (!newCatInput.trim()) return
    setAddCatMode(false)
    setExpandedCat(newCatInput.trim())
    setAddingToCat(newCatInput.trim())
    setNewCatInput('')
  }

  // ─── Item: add ──────────────────────────────────────────────────
  const addItem = (cat: string) => {
    if (!newItemForm.name.trim()) { setError('שם הפריט הוא שדה חובה'); return }
    setError('')
    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase.from('equipment_types').insert({
        category: cat,
        name: newItemForm.name.trim(),
        is_serialized: newItemForm.is_serialized,
        unit: newItemForm.unit || null,
        ownership: newItemForm.ownership,
      })
      if (error) { setError(error.message); return }
      setAddingToCat(null)
      setNewItemForm({ name: '', is_serialized: false, unit: 'יח\'', ownership: 'platoon' })
      router.refresh()
    })
  }

  // ─── Item: edit save ────────────────────────────────────────────
  const saveEdit = (id: number) => {
    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase.from('equipment_types').update(editForm).eq('id', id)
      if (error) { setError(error.message); return }
      setEditingType(null)
      router.refresh()
    })
  }

  // ─── Item: delete ───────────────────────────────────────────────
  const deleteItem = (id: number, name: string) => {
    if (!confirm(`למחוק את "${name}"?\nשים לב: פריטים שכבר חתומים לחיילים לא יימחקו.`)) return
    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase.from('equipment_types').delete().eq('id', id)
      if (error) { setError(error.message); return }
      router.refresh()
    })
  }

  return (
    <div className="space-y-3" dir="rtl">
      {/* Global error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          {error}
          <button onClick={() => setError('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{types.length} פריטים ב-{categories.length} קטגוריות</p>
        {!addCatMode && (
          <button
            onClick={() => setAddCatMode(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> קטגוריה חדשה
          </button>
        )}
      </div>

      {/* Add category inline */}
      {addCatMode && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-3">
          <FolderOpen className="w-4 h-4 text-blue-500 shrink-0" />
          <input
            autoFocus
            value={newCatInput}
            onChange={e => setNewCatInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addCategory(); if (e.key === 'Escape') setAddCatMode(false) }}
            placeholder="שם הקטגוריה החדשה"
            className="flex-1 border border-blue-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
          />
          <button onClick={addCategory} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-green-700 transition-colors">
            <Check className="w-4 h-4" />
          </button>
          <button onClick={() => setAddCatMode(false)} className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-sm hover:bg-slate-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Categories */}
      {categories.map(cat => {
        const catItems = types.filter(t => t.category === cat)
        const isOpen = expandedCat === cat
        const isRenamingThis = renamingCat === cat

        return (
          <div key={cat} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            {/* Category header */}
            <div
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors select-none"
              onClick={() => !isRenamingThis && setExpandedCat(isOpen ? null : cat)}
            >
              <span className="text-slate-400">
                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </span>

              {isRenamingThis ? (
                <div className="flex items-center gap-2 flex-1" onClick={e => e.stopPropagation()}>
                  <input
                    autoFocus
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveRename(cat); if (e.key === 'Escape') setRenamingCat(null) }}
                    className="border border-blue-300 rounded-lg px-3 py-1 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                  <button onClick={() => saveRename(cat)} disabled={isPending} className="text-green-600 hover:text-green-800 transition-colors">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => setRenamingCat(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <span className="font-semibold text-slate-700 flex-1">{cat}</span>
                  <span className="text-xs text-slate-400 ml-2">{catItems.length} פריטים</span>
                  <div className="flex items-center gap-1 mr-2" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => startRename(cat)}
                      title="שנה שם קטגוריה"
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteCat(cat)}
                      title="מחק קטגוריה"
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Items */}
            {isOpen && (
              <div className="border-t border-slate-100">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500">שם פריט</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500">בעלות</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500">יחידה</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500">מסודר?</th>
                      <th className="px-4 py-2 w-20"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {catItems.map(item => (
                      editingType === item.id ? (
                        // ── Inline edit row ──
                        <tr key={item.id} className="bg-blue-50/40">
                          <td className="px-3 py-2">
                            <input
                              autoFocus
                              value={editForm.name ?? ''}
                              onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                              onKeyDown={e => { if (e.key === 'Enter') saveEdit(item.id); if (e.key === 'Escape') setEditingType(null) }}
                              className="border border-blue-300 rounded-lg px-2 py-1 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-300"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={editForm.ownership ?? 'platoon'}
                              onChange={e => setEditForm(f => ({ ...f, ownership: e.target.value as EquipmentOwnership }))}
                              className="border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none"
                            >
                              <option value="personal">אישי</option>
                              <option value="platoon">פלוגתי</option>
                              <option value="battalion">גדודי</option>
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={editForm.unit ?? ''}
                              onChange={e => setEditForm(f => ({ ...f, unit: e.target.value || null }))}
                              className="border border-slate-200 rounded-lg px-2 py-1 text-sm w-16 focus:outline-none"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={editForm.is_serialized ? '1' : '0'}
                              onChange={e => setEditForm(f => ({ ...f, is_serialized: e.target.value === '1' }))}
                              className="border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none"
                            >
                              <option value="0">לא</option>
                              <option value="1">כן</option>
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1">
                              <button onClick={() => saveEdit(item.id)} disabled={isPending} className="text-green-600 hover:text-green-800 p-1 transition-colors">
                                <Check className="w-4 h-4" />
                              </button>
                              <button onClick={() => setEditingType(null)} className="text-slate-400 hover:text-slate-600 p-1 transition-colors">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        // ── Display row ──
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-4 py-2.5 font-medium text-slate-800">{item.name}</td>
                          <td className="px-4 py-2.5">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${OWNERSHIP_COLORS[item.ownership]}`}>
                              {OWNERSHIP_LABELS[item.ownership]}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-slate-500 text-xs">{item.unit ?? '—'}</td>
                          <td className="px-4 py-2.5 text-slate-500 text-xs">{item.is_serialized ? 'כן' : 'לא'}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                              <button
                                onClick={() => { setEditingType(item.id); setEditForm({ name: item.name, ownership: item.ownership, unit: item.unit, is_serialized: item.is_serialized }) }}
                                className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deleteItem(item.id, item.name)}
                                className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    ))}
                  </tbody>
                </table>

                {/* Add item to this category */}
                {addingToCat === cat ? (
                  <div className="px-4 py-3 bg-green-50/50 border-t border-slate-100 flex flex-wrap items-end gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-slate-500">שם פריט</label>
                      <input
                        autoFocus
                        value={newItemForm.name}
                        onChange={e => setNewItemForm(f => ({ ...f, name: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') addItem(cat); if (e.key === 'Escape') setAddingToCat(null) }}
                        placeholder="שם הפריט"
                        className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-green-300"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-slate-500">בעלות</label>
                      <select
                        value={newItemForm.ownership}
                        onChange={e => setNewItemForm(f => ({ ...f, ownership: e.target.value as EquipmentOwnership }))}
                        className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                      >
                        <option value="personal">אישי</option>
                        <option value="platoon">פלוגתי</option>
                        <option value="battalion">גדודי</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-slate-500">יחידה</label>
                      <input
                        value={newItemForm.unit}
                        onChange={e => setNewItemForm(f => ({ ...f, unit: e.target.value }))}
                        placeholder="יח'"
                        className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-16 focus:outline-none focus:ring-2 focus:ring-green-300"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-slate-500">מסודר?</label>
                      <select
                        value={newItemForm.is_serialized ? '1' : '0'}
                        onChange={e => setNewItemForm(f => ({ ...f, is_serialized: e.target.value === '1' }))}
                        className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                      >
                        <option value="0">לא</option>
                        <option value="1">כן</option>
                      </select>
                    </div>
                    <div className="flex gap-2 items-end">
                      <button
                        onClick={() => addItem(cat)}
                        disabled={isPending}
                        className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" /> הוסף
                      </button>
                      <button
                        onClick={() => { setAddingToCat(null); setError('') }}
                        className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-sm hover:bg-slate-200 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" /> ביטול
                      </button>
                    </div>
                    {error && <p className="text-xs text-red-600 w-full">{error}</p>}
                  </div>
                ) : (
                  <div className="px-4 py-2.5 border-t border-slate-100">
                    <button
                      onClick={() => { setAddingToCat(cat); setNewItemForm({ name: '', is_serialized: false, unit: 'יח\'', ownership: 'platoon' }) }}
                      className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> הוסף פריט ל{cat}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
