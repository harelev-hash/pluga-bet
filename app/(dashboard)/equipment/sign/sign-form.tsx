'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { EquipmentType, EquipmentItem, EquipmentTemplate } from '@/lib/types/database'
import { Plus, Trash2, Check, AlertCircle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'

interface Soldier { id: number; full_name: string; rank: string; role_in_unit: string | null; department_id: number | null }

interface SignRow {
  key: string
  type_id: number | null
  item_id: number | null       // serialized
  serialInput: string          // text input for serial number
  quantity: number             // quantitative
  attribute: string
  condition_in: string
  notes: string
  // derived
  typeName: string
  isSerialized: boolean
  requiresAttribute: boolean
  attributeOptions: string[]
}

interface Props {
  soldiers: Soldier[]
  types: EquipmentType[]
  items: EquipmentItem[]
  templates: EquipmentTemplate[]
  currentPeriodId: number | null
}

const CONDITION_OPTIONS = [
  { value: 'serviceable', label: 'תקין' },
  { value: 'worn',        label: 'בלאי' },
  { value: 'damaged',     label: 'פגום' },
]

let _key = 0
const nextKey = () => String(++_key)

export default function SignForm({ soldiers, types, items, templates, currentPeriodId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [soldierId, setSoldierId] = useState<number | null>(null)
  const [rows, setRows] = useState<SignRow[]>([])
  const [mode, setMode] = useState<'active' | 'planned'>('active')
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null)
  const [existingAssignments, setExistingAssignments] = useState<{ id: number; name: string; attribute: string | null; status: string }[]>([])
  const [showExisting, setShowExisting] = useState(true)

  useEffect(() => {
    if (!soldierId) { setExistingAssignments([]); return }
    const supabase = createClient()
    supabase
      .from('equipment_assignments')
      .select('id, status, attribute, item:equipment_items(type:equipment_types(name)), type:equipment_types(name)')
      .eq('soldier_id', soldierId)
      .in('status', ['active', 'planned'])
      .order('status')
      .then(({ data }) => {
        setExistingAssignments((data ?? []).map((a: any) => ({
          id: a.id,
          name: a.item?.type?.name ?? a.type?.name ?? '—',
          attribute: a.attribute,
          status: a.status,
        })))
      })
  }, [soldierId])

  const soldier = soldiers.find(s => s.id === soldierId)

  // Compute which serialized items are already assigned to someone else
  // (we do a client-side check: if item_id is used, don't offer it)
  // We pass only serviceable items from server

  const freeSerializedItems = (typeId: number) =>
    items.filter(i => i.type_id === typeId && !rows.some(r => r.item_id === i.id))

  const loadTemplate = (templateId: number) => {
    const tmpl = templates.find(t => t.id === templateId)
    if (!tmpl?.items) return
    const newRows: SignRow[] = tmpl.items
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(ti => {
        const type = types.find(t => t.id === ti.type_id)
        if (!type) return null
        return {
          key: nextKey(),
          type_id: type.id,
          item_id: null,
          serialInput: '',
          quantity: ti.default_quantity,
          attribute: '',
          condition_in: 'serviceable',
          notes: '',
          typeName: type.name,
          isSerialized: type.is_serialized,
          requiresAttribute: ti.requires_attribute,
          attributeOptions: ti.attribute_options ?? [],
        } satisfies SignRow
      })
      .filter(Boolean) as SignRow[]
    setRows(prev => {
      // merge: keep existing rows, add new ones not already present
      const existingTypes = new Set(prev.map(r => r.type_id))
      const toAdd = newRows.filter(r => !existingTypes.has(r.type_id))
      return [...prev, ...toAdd]
    })
  }

  const addRow = () => {
    setRows(prev => [...prev, {
      key: nextKey(), type_id: null, item_id: null, serialInput: '', quantity: 1, attribute: '',
      condition_in: 'serviceable', notes: '', typeName: '', isSerialized: false,
      requiresAttribute: false, attributeOptions: [],
    }])
  }

  const updateRow = (key: string, patch: Partial<SignRow>) => {
    setRows(prev => prev.map(r => {
      if (r.key !== key) return r
      const updated = { ...r, ...patch }
      // when type changes, reset item/attribute
      if (patch.type_id !== undefined && patch.type_id !== r.type_id) {
        const type = types.find(t => t.id === patch.type_id)
        updated.item_id = null
        updated.serialInput = ''
        updated.attribute = ''
        updated.typeName = type?.name ?? ''
        updated.isSerialized = type?.is_serialized ?? false
        updated.requiresAttribute = false
        updated.attributeOptions = []
      }
      return updated
    }))
  }

  const removeRow = (key: string) => setRows(prev => prev.filter(r => r.key !== key))

  const canSubmit = soldierId && rows.length > 0 && rows.every(r =>
    r.type_id &&
    (!r.isSerialized || r.serialInput.trim()) &&
    (!r.requiresAttribute || r.attribute)
  )

  const handleSubmit = () => {
    if (!soldierId || !canSubmit) return
    setResult(null)
    startTransition(async () => {
      const supabase = createClient()
      const errors: string[] = []
      let success = 0

      for (const row of rows) {
        const payload: Record<string, unknown> = {
          soldier_id: soldierId,
          period_id: currentPeriodId,
          status: mode,
          condition_in: row.condition_in,
          attribute: row.attribute || null,
          notes: row.notes || null,
          ...(mode === 'active' ? { signed_at: new Date().toISOString() } : {}),
        }
        if (row.isSerialized) {
          let itemId = row.item_id
          if (!itemId && row.serialInput.trim()) {
            // Create new equipment_item for this serial number
            const { data: newItem, error: itemErr } = await supabase
              .from('equipment_items')
              .insert({ type_id: row.type_id, serial_number: row.serialInput.trim(), condition: row.condition_in })
              .select('id')
              .single()
            if (itemErr) { errors.push(`${row.typeName}: ${itemErr.message}`); continue }
            itemId = newItem.id
          }
          payload.item_id = itemId
          payload.quantity = 1
        } else {
          payload.type_id = row.type_id
          payload.quantity = row.quantity
        }

        const { error } = await supabase.from('equipment_assignments').insert(payload)
        if (error) errors.push(`${row.typeName}: ${error.message}`)
        else success++
      }

      setResult({ success, errors })
      if (errors.length === 0) {
        setRows([])
        setSoldierId(null)
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Soldier select */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 space-y-3">
        <label className="block text-sm font-semibold text-slate-700">חייל</label>
        <select
          value={soldierId ?? ''}
          onChange={e => { setSoldierId(e.target.value ? parseInt(e.target.value) : null); setRows([]) }}
          className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">בחר חייל...</option>
          {soldiers.map(s => (
            <option key={s.id} value={s.id}>{s.full_name}</option>
          ))}
        </select>

        {soldier && templates.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">טען תבנית:</span>
            <div className="flex flex-wrap gap-2">
              {templates.map(tmpl => (
                <button
                  key={tmpl.id}
                  onClick={() => loadTemplate(tmpl.id)}
                  className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                >
                  {tmpl.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Existing equipment */}
        {soldierId && existingAssignments.length > 0 && (
          <div className="border border-slate-100 rounded-lg overflow-hidden">
            <button
              onClick={() => setShowExisting(v => !v)}
              className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 transition-colors text-xs font-semibold text-slate-600"
            >
              <span>ציוד קיים ({existingAssignments.length} פריטים)</span>
              {showExisting ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {showExisting && (
              <div className="divide-y divide-slate-50">
                {existingAssignments.map(a => (
                  <div key={a.id} className="flex items-center gap-2 px-3 py-1.5 text-xs">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium shrink-0 ${a.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      {a.status === 'active' ? 'חתום' : 'מיועד'}
                    </span>
                    <span className="text-slate-700">{a.name}</span>
                    {a.attribute && <span className="text-slate-400">({a.attribute})</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Mode toggle */}
        <div className="flex items-center gap-2 pt-1">
          <span className="text-xs text-slate-500 ml-1">פעולה:</span>
          <button
            onClick={() => setMode('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${mode === 'active' ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            החתם עכשיו
          </button>
          <button
            onClick={() => setMode('planned')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${mode === 'planned' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            ייעד בלבד
          </button>
        </div>
      </div>

      {/* Rows */}
      {soldierId && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="font-semibold text-slate-700">{mode === 'active' ? 'פריטים לחתימה' : 'פריטים לייעוד'} ({rows.length})</span>
            <button
              onClick={addRow}
              className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> הוסף פריט
            </button>
          </div>

          {rows.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-sm">
              בחר תבנית או הוסף פריט ידנית
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {rows.map(row => (
                <SignRowComponent
                  key={row.key}
                  row={row}
                  types={types}
                  freeSerializedItems={freeSerializedItems}
                  onUpdate={patch => updateRow(row.key, patch)}
                  onRemove={() => removeRow(row.key)}
                />
              ))}
            </div>
          )}

          {rows.length > 0 && (
            <div className="p-4 border-t border-slate-100 flex items-center justify-between">
              <div>
                {!canSubmit && rows.length > 0 && (
                  <p className="text-xs text-amber-600">
                    יש להשלים את כל השדות הנדרשים לפני האישור
                  </p>
                )}
              </div>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit || isPending}
                className={`flex items-center gap-2 text-white px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors shadow-sm ${mode === 'active' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                <Check className="w-4 h-4" />
                {isPending ? 'שומר...' : mode === 'active' ? `אשר חתימה (${rows.length} פריטים)` : `ייעד (${rows.length} פריטים)`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-2">
          {result.success > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-2 text-sm text-green-700">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              {result.success} פריטים {mode === 'active' ? 'נחתמו' : 'יועדו'} בהצלחה!
            </div>
          )}
          {result.errors.map((e, i) => (
            <div key={i} className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {e}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SignRowComponent({
  row, types, freeSerializedItems, onUpdate, onRemove,
}: {
  row: SignRow
  types: EquipmentType[]
  freeSerializedItems: (typeId: number) => EquipmentItem[]
  onUpdate: (patch: Partial<SignRow>) => void
  onRemove: () => void
}) {
  const serialItems = row.type_id && row.isSerialized ? freeSerializedItems(row.type_id) : []
  const isValid = row.type_id && (!row.isSerialized || row.item_id) && (!row.requiresAttribute || row.attribute)

  return (
    <div className={`p-4 flex flex-wrap gap-3 items-end ${!isValid ? 'bg-amber-50/30' : ''}`}>
      {/* Type select */}
      <div className="flex flex-col gap-1 flex-1 min-w-40">
        <label className="text-xs text-slate-500">סוג ציוד</label>
        <select
          value={row.type_id ?? ''}
          onChange={e => onUpdate({ type_id: e.target.value ? parseInt(e.target.value) : null })}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">בחר סוג...</option>
          {types.map(t => (
            <option key={t.id} value={t.id}>{t.category} — {t.name}</option>
          ))}
        </select>
      </div>

      {/* Serialized: serial number input with autocomplete from existing items */}
      {row.isSerialized && (
        <div className="flex flex-col gap-1 min-w-36">
          <label className="text-xs text-slate-500">מספר סידורי</label>
          <input
            list={`serials-${row.key}`}
            value={row.serialInput ?? ''}
            onChange={e => {
              const val = e.target.value
              const match = serialItems.find(i => i.serial_number === val)
              onUpdate({ serialInput: val, item_id: match?.id ?? null })
            }}
            placeholder="הקלד מ״ס..."
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 font-mono"
          />
          <datalist id={`serials-${row.key}`}>
            {serialItems.map(i => (
              <option key={i.id} value={i.serial_number ?? ''}>
                {i.location ? `(${i.location})` : ''}
              </option>
            ))}
          </datalist>
          {row.type_id && serialItems.length === 0 && (
            <p className="text-xs text-amber-500">אין פריטים קיימים במלאי</p>
          )}
        </div>
      )}

      {/* Quantitative: qty */}
      {!row.isSerialized && row.type_id && (
        <div className="flex flex-col gap-1 w-20">
          <label className="text-xs text-slate-500">כמות</label>
          <input
            type="number"
            min={1}
            value={row.quantity}
            onChange={e => onUpdate({ quantity: parseInt(e.target.value) || 1 })}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
      )}

      {/* Attribute (vest type, helmet size, etc.) */}
      {row.type_id && (
        <div className="flex flex-col gap-1 min-w-32">
          <label className="text-xs text-slate-500">
            {row.requiresAttribute ? '* סוג / מידה' : 'סוג / מידה (רשות)'}
          </label>
          {row.attributeOptions.length > 0 ? (
            <select
              value={row.attribute}
              onChange={e => onUpdate({ attribute: e.target.value })}
              className={`border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 ${row.requiresAttribute && !row.attribute ? 'border-amber-300' : 'border-slate-200'}`}
            >
              <option value="">בחר...</option>
              {row.attributeOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : (
            <input
              value={row.attribute}
              onChange={e => onUpdate({ attribute: e.target.value })}
              placeholder={row.requiresAttribute ? 'חובה' : 'למשל: עמרן, M...'}
              className={`border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 ${row.requiresAttribute && !row.attribute ? 'border-amber-300' : 'border-slate-200'}`}
            />
          )}
        </div>
      )}

      {/* Condition */}
      <div className="flex flex-col gap-1 min-w-28">
        <label className="text-xs text-slate-500">מצב</label>
        <select
          value={row.condition_in}
          onChange={e => onUpdate({ condition_in: e.target.value })}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          {CONDITION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-1 flex-1 min-w-32">
        <label className="text-xs text-slate-500">הערות</label>
        <input
          value={row.notes}
          onChange={e => onUpdate({ notes: e.target.value })}
          placeholder="הערה (אופציונלי)"
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>

      <button
        onClick={onRemove}
        className="text-slate-300 hover:text-red-500 transition-colors mb-0.5 self-end"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}
