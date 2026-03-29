'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Save, X } from 'lucide-react'

interface Department { id: number; name: string }
interface Soldier { id: number; full_name: string; rank: string; department_id: number | null }
interface EquipType { id: number; name: string; category: string }
interface Assignment {
  id: number
  soldier_id: number
  condition_in: string
  attribute: string | null
  item: { serial_number: string | null } | null
  type: { id: number; name: string } | null
}

interface Props {
  departments: Department[]
  soldiers: Soldier[]
  equipTypes: EquipType[]
  assignments: Assignment[]
}

type ItemKind = 'wear' | 'missing_soldier' | 'missing_dept' | 'free_text'

interface CartItem {
  localId: string
  kind: ItemKind
  soldier_id: string
  assignment_id: string   // wear: specific assignment
  type_id: string         // missing_soldier / missing_dept: from catalog
  type_free_text: string  // missing_soldier / missing_dept: typed manually
  quantity: string
  free_text: string       // free_text kind
  notes: string
}

const KIND_LABELS: Record<ItemKind, string> = {
  wear: 'בלאי לחייל',
  missing_soldier: 'ציוד חסר לחייל',
  missing_dept: 'ציוד למחלקה',
  free_text: 'מלל חופשי',
}

const KIND_COLORS: Record<ItemKind, string> = {
  wear:            'border-r-4 border-r-amber-400',
  missing_soldier: 'border-r-4 border-r-blue-400',
  missing_dept:    'border-r-4 border-r-emerald-400',
  free_text:       'border-r-4 border-r-slate-300',
}

function newItem(kind: ItemKind = 'missing_dept'): CartItem {
  return {
    localId: Math.random().toString(36).slice(2),
    kind,
    soldier_id: '',
    assignment_id: '',
    type_id: '',
    type_free_text: '',
    quantity: '1',
    free_text: '',
    notes: '',
  }
}

const CONDITION_LABEL: Record<string, string> = {
  serviceable: 'תקין', worn: 'בלאי', damaged: 'פגום',
}

export default function RequestForm({ departments, soldiers, equipTypes, assignments }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]
  const [deptId, setDeptId] = useState('')
  const [title, setTitle] = useState('')
  const [requestDate, setRequestDate] = useState(today)
  const [items, setItems] = useState<CartItem[]>([newItem('missing_dept')])

  const deptSoldiers = soldiers.filter(s => s.department_id === parseInt(deptId))

  const soldierAssignments = (soldierId: string) =>
    assignments.filter(a => a.soldier_id === parseInt(soldierId))

  const updateItem = (localId: string, patch: Partial<CartItem>) =>
    setItems(prev => prev.map(it => it.localId === localId ? { ...it, ...patch } : it))

  const removeItem = (localId: string) =>
    setItems(prev => prev.filter(it => it.localId !== localId))

  const addItem = (kind: ItemKind) =>
    setItems(prev => [...prev, newItem(kind)])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!deptId) { setError('יש לבחור מחלקה'); return }
    if (items.length === 0) { setError('יש להוסיף לפחות סעיף אחד'); return }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    startTransition(async () => {
      const { data: req, error: reqErr } = await supabase
        .from('melm_requests')
        .insert({
          title: title || null,
          department_id: parseInt(deptId),
          request_date: requestDate,
          status: 'open',
          submitted_by: user?.id ?? null,
        })
        .select()
        .single()

      if (reqErr) { setError(reqErr.message); return }

      const itemPayloads = items.map(it => ({
        request_id: req.id,
        item_kind: it.kind,
        soldier_id: it.soldier_id ? parseInt(it.soldier_id) : null,
        assignment_id: it.assignment_id ? parseInt(it.assignment_id) : null,
        type_id: it.type_id ? parseInt(it.type_id) : null,
        free_text: it.kind === 'free_text'
          ? it.free_text || null
          : it.type_free_text || null,
        quantity_requested: parseInt(it.quantity) || 1,
        notes: it.notes || null,
        resap_status: 'pending',
      }))

      const { error: itemsErr } = await supabase.from('melm_items').insert(itemPayloads)
      if (itemsErr) { setError(itemsErr.message); return }

      router.push('/melm')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <X className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Header fields */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">תאריך</label>
          <input
            type="date"
            value={requestDate}
            onChange={e => setRequestDate(e.target.value)}
            className="input w-full"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">מחלקה *</label>
          <select
            value={deptId}
            onChange={e => setDeptId(e.target.value)}
            className="input w-full"
            required
          >
            <option value="">— בחר מחלקה —</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">כותרת (אופציונלי)</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="לדוגמה: אחרי תרגיל 3"
            className="input w-full"
          />
        </div>
      </div>

      {/* Cart items */}
      <div className="space-y-2">
        {items.map(item => (
          <CartItemRow
            key={item.localId}
            item={item}
            deptSoldiers={deptSoldiers}
            soldierAssignments={soldierAssignments}
            equipTypes={equipTypes}
            onChange={patch => updateItem(item.localId, patch)}
            onRemove={() => removeItem(item.localId)}
          />
        ))}
      </div>

      {/* Add item buttons */}
      <div className="bg-white rounded-xl border border-dashed border-slate-200 p-3">
        <p className="text-xs text-slate-400 mb-2 font-medium">הוסף סעיף:</p>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(KIND_LABELS) as [ItemKind, string][]).map(([kind, label]) => (
            <button
              key={kind}
              type="button"
              onClick={() => addItem(kind)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Submit */}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
        >
          <Save className="w-4 h-4" />
          {isPending ? 'שולח...' : 'שלח בקשה'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-lg text-sm hover:bg-slate-50 transition-colors"
        >
          ביטול
        </button>
      </div>
    </form>
  )
}

// ─── Cart item row ────────────────────────────────────────────────────────────

interface RowProps {
  item: CartItem
  deptSoldiers: Soldier[]
  soldierAssignments: (id: string) => Assignment[]
  equipTypes: EquipType[]
  onChange: (patch: Partial<CartItem>) => void
  onRemove: () => void
}

function CartItemRow({ item, deptSoldiers, soldierAssignments, equipTypes, onChange, onRemove }: RowProps) {
  const assignments = item.soldier_id ? soldierAssignments(item.soldier_id) : []

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-100 p-4 space-y-3 ${KIND_COLORS[item.kind]}`}>
      {/* Row header: kind selector + delete */}
      <div className="flex items-center justify-between">
        <select
          value={item.kind}
          onChange={e => onChange({ kind: e.target.value as ItemKind, soldier_id: '', assignment_id: '', type_id: '', type_free_text: '' })}
          className="text-sm font-semibold text-slate-700 bg-transparent border-none focus:outline-none cursor-pointer"
        >
          {(Object.entries(KIND_LABELS) as [ItemKind, string][]).map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
        <button type="button" onClick={onRemove} className="text-slate-300 hover:text-red-400 transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Context fields */}
      {item.kind === 'wear' && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-slate-400 mb-1">חייל</label>
              <select
                value={item.soldier_id}
                onChange={e => onChange({ soldier_id: e.target.value, assignment_id: '' })}
                className="input w-full text-sm"
              >
                <option value="">— בחר חייל —</option>
                {deptSoldiers.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">פריט לסימון כבלאי</label>
              <select
                value={item.assignment_id}
                onChange={e => onChange({ assignment_id: e.target.value })}
                className="input w-full text-sm"
                disabled={!item.soldier_id}
              >
                <option value="">— בחר פריט —</option>
                {assignments.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.type?.name ?? '—'}
                    {a.item?.serial_number ? ` #${a.item.serial_number}` : ''}
                    {a.attribute ? ` (${a.attribute})` : ''}
                    {' · '}
                    {CONDITION_LABEL[a.condition_in] ?? a.condition_in}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {item.kind === 'missing_soldier' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-slate-400 mb-1">חייל</label>
            <select
              value={item.soldier_id}
              onChange={e => onChange({ soldier_id: e.target.value })}
              className="input w-full text-sm"
            >
              <option value="">— בחר חייל —</option>
              {deptSoldiers.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">ציוד מבוקש</label>
            <EquipInput
              typeId={item.type_id}
              freeText={item.type_free_text}
              equipTypes={equipTypes}
              onChangeTypeId={v => onChange({ type_id: v, type_free_text: '' })}
              onChangeFreeText={v => onChange({ type_free_text: v, type_id: '' })}
            />
          </div>
        </div>
      )}

      {item.kind === 'missing_dept' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-slate-400 mb-1">ציוד מבוקש</label>
            <EquipInput
              typeId={item.type_id}
              freeText={item.type_free_text}
              equipTypes={equipTypes}
              onChangeTypeId={v => onChange({ type_id: v, type_free_text: '' })}
              onChangeFreeText={v => onChange({ type_free_text: v, type_id: '' })}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">כמות</label>
            <input
              type="number"
              min="1"
              value={item.quantity}
              onChange={e => onChange({ quantity: e.target.value })}
              className="input w-full text-sm"
            />
          </div>
        </div>
      )}

      {item.kind === 'free_text' && (
        <div>
          <label className="block text-xs text-slate-400 mb-1">תיאור חופשי</label>
          <textarea
            value={item.free_text}
            onChange={e => onChange({ free_text: e.target.value })}
            placeholder="כתוב את הבקשה בחופשיות..."
            className="input w-full text-sm resize-none h-16"
          />
        </div>
      )}

      {/* Notes (always shown) */}
      {item.kind !== 'free_text' && (
        <div>
          <label className="block text-xs text-slate-400 mb-1">הערות</label>
          <input
            value={item.notes}
            onChange={e => onChange({ notes: e.target.value })}
            placeholder="הערה נוספת (אופציונלי)"
            className="input w-full text-sm"
          />
        </div>
      )}
    </div>
  )
}

// ─── Equipment input: datalist + free text fallback ──────────────────────────

interface EquipInputProps {
  typeId: string
  freeText: string
  equipTypes: EquipType[]
  onChangeTypeId: (v: string) => void
  onChangeFreeText: (v: string) => void
}

function EquipInput({ typeId, freeText, equipTypes, onChangeTypeId, onChangeFreeText }: EquipInputProps) {
  const listId = 'equip-list-' + Math.random().toString(36).slice(2)
  const displayValue = typeId
    ? (equipTypes.find(t => t.id === parseInt(typeId))?.name ?? '')
    : freeText

  const handleChange = (val: string) => {
    const match = equipTypes.find(t => t.name === val)
    if (match) {
      onChangeTypeId(match.id.toString())
    } else {
      onChangeFreeText(val)
    }
  }

  return (
    <>
      <input
        list={listId}
        value={displayValue}
        onChange={e => handleChange(e.target.value)}
        placeholder="חפש או הקלד שם ציוד..."
        className="input w-full text-sm"
      />
      <datalist id={listId}>
        {equipTypes.map(t => <option key={t.id} value={t.name} />)}
      </datalist>
    </>
  )
}
