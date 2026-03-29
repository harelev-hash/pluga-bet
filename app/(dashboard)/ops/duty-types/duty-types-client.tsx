'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Pencil, Trash2, Save, X, ChevronDown, ChevronUp } from 'lucide-react'

interface DutyPosition {
  id: number
  name: string
  category: string
  shift_duration_hours: number
  fixed_shift_starts: string[] | null
  rest_hours_after: number
  pre_buffer_hours: number
  requires_qualification: boolean
  is_standby: boolean
  standby_blocks_all: boolean
  display_order: number
  color: string
  is_active: boolean
  notes: string | null
}

interface TimeRule {
  id: number
  position_id: number
  from_hour: number
  to_hour: number
  required_count: number
}

interface Props {
  positions: DutyPosition[]
  timeRules: TimeRule[]
}

const CATEGORIES = [
  { value: 'guard',   label: 'עמדת שמירה' },
  { value: 'watch',   label: 'כוננות / חמ"ל' },
  { value: 'standby', label: 'כוננות כוח' },
  { value: 'mission', label: 'משימה מיוחדת' },
]

const COLORS = [
  { value: 'slate',   label: 'אפור' },
  { value: 'blue',    label: 'כחול' },
  { value: 'amber',   label: 'כתום' },
  { value: 'emerald', label: 'ירוק' },
  { value: 'red',     label: 'אדום' },
  { value: 'purple',  label: 'סגול' },
]

const COLOR_DOT: Record<string, string> = {
  slate:   'bg-slate-400',
  blue:    'bg-blue-500',
  amber:   'bg-amber-500',
  emerald: 'bg-emerald-500',
  red:     'bg-red-500',
  purple:  'bg-purple-500',
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${String(i).padStart(2, '0')}:00`,
}))

const emptyForm = (): Omit<DutyPosition, 'id'> => ({
  name: '',
  category: 'guard',
  shift_duration_hours: 2,
  fixed_shift_starts: null,
  rest_hours_after: 6,
  pre_buffer_hours: 0,
  requires_qualification: false,
  is_standby: false,
  standby_blocks_all: false,
  display_order: 0,
  color: 'slate',
  is_active: true,
  notes: null,
})

export default function DutyTypesClient({ positions: initial, timeRules: initialRules }: Props) {
  const [positions, setPositions] = useState(initial)
  const [timeRules, setTimeRules] = useState(initialRules)
  const [isPending, startTransition] = useTransition()

  // Edit state
  const [editingId, setEditingId] = useState<number | 'new' | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [expandedId, setExpandedId] = useState<number | null>(null)

  // Fixed shift starts (comma-separated input)
  const [fixedStartsInput, setFixedStartsInput] = useState('')

  // Time rules editing (per position)
  const [editingRules, setEditingRules] = useState<TimeRule[]>([])

  const openNew = () => {
    setForm(emptyForm())
    setFixedStartsInput('')
    setEditingRules([])
    setEditingId('new')
  }

  const openEdit = (pos: DutyPosition) => {
    setForm({ ...pos })
    setFixedStartsInput(pos.fixed_shift_starts?.join(', ') ?? '')
    setEditingRules(timeRules.filter(r => r.position_id === pos.id).map(r => ({ ...r })))
    setEditingId(pos.id)
  }

  const cancelEdit = () => setEditingId(null)

  const savePosition = () => {
    startTransition(async () => {
      const supabase = createClient()
      const payload = {
        ...form,
        fixed_shift_starts: fixedStartsInput.trim()
          ? fixedStartsInput.split(',').map(s => s.trim()).filter(Boolean)
          : null,
      }

      let savedId: number
      if (editingId === 'new') {
        const { data, error } = await supabase
          .from('duty_positions')
          .insert(payload)
          .select()
          .single()
        if (error || !data) return
        savedId = data.id
        setPositions(prev => [...prev, data])
      } else {
        const { data, error } = await supabase
          .from('duty_positions')
          .update(payload)
          .eq('id', editingId as number)
          .select()
          .single()
        if (error || !data) return
        savedId = data.id
        setPositions(prev => prev.map(p => p.id === savedId ? data : p))
      }

      // Save time rules: delete existing, re-insert
      await supabase.from('position_time_rules').delete().eq('position_id', savedId)
      if (editingRules.length > 0) {
        const { data: newRules } = await supabase
          .from('position_time_rules')
          .insert(editingRules.map(r => ({
            position_id: savedId,
            from_hour: r.from_hour,
            to_hour: r.to_hour,
            required_count: r.required_count,
          })))
          .select()
        setTimeRules(prev => [
          ...prev.filter(r => r.position_id !== savedId),
          ...(newRules ?? []),
        ])
      } else {
        setTimeRules(prev => prev.filter(r => r.position_id !== savedId))
      }

      setEditingId(null)
    })
  }

  const deletePosition = (id: number) => {
    if (!confirm('למחוק עמדה זו?')) return
    startTransition(async () => {
      const supabase = createClient()
      await supabase.from('duty_positions').delete().eq('id', id)
      setPositions(prev => prev.filter(p => p.id !== id))
      setTimeRules(prev => prev.filter(r => r.position_id !== id))
    })
  }

  const addRule = () => setEditingRules(prev => [...prev, { id: 0, position_id: 0, from_hour: 19, to_hour: 7, required_count: 2 }])
  const removeRule = (i: number) => setEditingRules(prev => prev.filter((_, idx) => idx !== i))
  const updateRule = (i: number, patch: Partial<TimeRule>) =>
    setEditingRules(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r))

  const rulesForPos = (id: number) => timeRules.filter(r => r.position_id === id)

  return (
    <div className="space-y-4">
      {/* Add button */}
      <div className="flex justify-end">
        <button
          onClick={openNew}
          disabled={editingId !== null}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
        >
          <Plus className="w-4 h-4" /> הוסף עמדה
        </button>
      </div>

      {/* New position form */}
      {editingId === 'new' && (
        <PositionForm
          form={form}
          setForm={setForm}
          fixedStartsInput={fixedStartsInput}
          setFixedStartsInput={setFixedStartsInput}
          editingRules={editingRules}
          addRule={addRule}
          removeRule={removeRule}
          updateRule={updateRule}
          onSave={savePosition}
          onCancel={cancelEdit}
          isPending={isPending}
        />
      )}

      {/* Positions list */}
      {positions.length === 0 && editingId !== 'new' && (
        <div className="bg-white rounded-xl border border-slate-100 py-12 text-center text-slate-400">
          לא הוגדרו עמדות עדיין
        </div>
      )}

      {positions.map(pos => {
        const rules = rulesForPos(pos.id)
        const isEditing = editingId === pos.id
        const isExpanded = expandedId === pos.id

        if (isEditing) {
          return (
            <PositionForm
              key={pos.id}
              form={form}
              setForm={setForm}
              fixedStartsInput={fixedStartsInput}
              setFixedStartsInput={setFixedStartsInput}
              editingRules={editingRules}
              addRule={addRule}
              removeRule={removeRule}
              updateRule={updateRule}
              onSave={savePosition}
              onCancel={cancelEdit}
              isPending={isPending}
            />
          )
        }

        return (
          <div key={pos.id} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Header row */}
            <div className="flex items-center gap-3 p-4">
              <div className={`w-3 h-3 rounded-full shrink-0 ${COLOR_DOT[pos.color] ?? 'bg-slate-400'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-800">{pos.name}</span>
                  <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                    {CATEGORIES.find(c => c.value === pos.category)?.label ?? pos.category}
                  </span>
                  {!pos.is_active && (
                    <span className="text-xs bg-red-100 text-red-500 px-2 py-0.5 rounded-full">לא פעיל</span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {pos.shift_duration_hours}ש' משמרת · מנוחה {pos.rest_hours_after}ש'
                  {pos.pre_buffer_hours > 0 && ` · בופר לפני ${pos.pre_buffer_hours}ש'`}
                  {pos.fixed_shift_starts?.length ? ` · קבוע: ${pos.fixed_shift_starts.join(', ')}` : ' · רולינג'}
                  {pos.requires_qualification && ' · דורש הסמכה'}
                  {pos.is_standby && (pos.standby_blocks_all ? ' · כוננות חוסמת' : ' · כוננות לא חוסמת')}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : pos.id)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
                  title="כללי זמן"
                >
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => openEdit(pos)}
                  disabled={editingId !== null}
                  className="p-1.5 text-slate-400 hover:text-blue-600 disabled:opacity-40 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deletePosition(pos.id)}
                  disabled={isPending || editingId !== null}
                  className="p-1.5 text-slate-400 hover:text-red-500 disabled:opacity-40 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Time rules summary */}
            {isExpanded && (
              <div className="border-t border-slate-100 px-4 py-3 bg-slate-50">
                <p className="text-xs font-semibold text-slate-500 mb-2">כללי כמות לפי שעה</p>
                {rules.length === 0 ? (
                  <p className="text-xs text-slate-400">ברירת מחדל: 1 חייל בכל שעות</p>
                ) : (
                  <div className="space-y-1">
                    {rules.map(r => (
                      <p key={r.id} className="text-xs text-slate-600">
                        {String(r.from_hour).padStart(2,'0')}:00
                        {' → '}
                        {String(r.to_hour).padStart(2,'0')}:00
                        {' — '}
                        {r.required_count} חיילים
                      </p>
                    ))}
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

// ── Inline form component ──────────────────────────────────────────────────
function PositionForm({
  form, setForm,
  fixedStartsInput, setFixedStartsInput,
  editingRules, addRule, removeRule, updateRule,
  onSave, onCancel, isPending,
}: {
  form: Omit<DutyPosition, 'id'>
  setForm: React.Dispatch<React.SetStateAction<Omit<DutyPosition, 'id'>>>
  fixedStartsInput: string
  setFixedStartsInput: (v: string) => void
  editingRules: TimeRule[]
  addRule: () => void
  removeRule: (i: number) => void
  updateRule: (i: number, patch: Partial<TimeRule>) => void
  onSave: () => void
  onCancel: () => void
  isPending: boolean
}) {
  const set = (patch: Partial<typeof form>) => setForm(f => ({ ...f, ...patch }))
  const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i)

  return (
    <div className="bg-white rounded-xl border-2 border-blue-200 shadow-sm p-5 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {/* Name */}
        <div className="col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">שם עמדה</label>
          <input
            value={form.name}
            onChange={e => set({ name: e.target.value })}
            placeholder='למשל: ש"ג'
            className="input w-full text-sm"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">קטגוריה</label>
          <select value={form.category} onChange={e => set({ category: e.target.value })} className="input w-full text-sm">
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        {/* Color */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">צבע</label>
          <select value={form.color} onChange={e => set({ color: e.target.value })} className="input w-full text-sm">
            {COLORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        {/* Shift duration */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">אורך משמרת (שעות)</label>
          <input
            type="number" min={1} max={24} step={0.5}
            value={form.shift_duration_hours}
            onChange={e => set({ shift_duration_hours: parseFloat(e.target.value) || 2 })}
            className="input w-full text-sm"
          />
        </div>

        {/* Rest after */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">מנוחה אחרי (שעות)</label>
          <input
            type="number" min={0} max={24}
            value={form.rest_hours_after}
            onChange={e => set({ rest_hours_after: parseInt(e.target.value) || 0 })}
            className="input w-full text-sm"
          />
        </div>

        {/* Pre-buffer */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">מנוחה לפני משימה (שעות)</label>
          <input
            type="number" min={0} max={24}
            value={form.pre_buffer_hours}
            onChange={e => set({ pre_buffer_hours: parseInt(e.target.value) || 0 })}
            className="input w-full text-sm"
          />
        </div>

        {/* Display order */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">סדר תצוגה</label>
          <input
            type="number" min={0}
            value={form.display_order}
            onChange={e => set({ display_order: parseInt(e.target.value) || 0 })}
            className="input w-full text-sm"
          />
        </div>

        {/* Fixed shift starts */}
        <div className="col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">
            שעות התחלה קבועות (מופרדות בפסיק) — ריק = רולינג
          </label>
          <input
            value={fixedStartsInput}
            onChange={e => setFixedStartsInput(e.target.value)}
            placeholder="למשל: 07:00, 15:00, 23:00"
            className="input w-full text-sm"
          />
        </div>

        {/* Checkboxes */}
        <div className="col-span-2 flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input type="checkbox" checked={form.requires_qualification}
              onChange={e => set({ requires_qualification: e.target.checked })} />
            דורש הסמכה
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input type="checkbox" checked={form.is_standby}
              onChange={e => set({ is_standby: e.target.checked })} />
            כוננות
          </label>
          {form.is_standby && (
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input type="checkbox" checked={form.standby_blocks_all}
                onChange={e => set({ standby_blocks_all: e.target.checked })} />
              כוננות חוסמת (לא ניתן למשימות אחרות)
            </label>
          )}
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input type="checkbox" checked={form.is_active}
              onChange={e => set({ is_active: e.target.checked })} />
            פעיל
          </label>
        </div>

        {/* Notes */}
        <div className="col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">הערות</label>
          <input
            value={form.notes ?? ''}
            onChange={e => set({ notes: e.target.value || null })}
            className="input w-full text-sm"
          />
        </div>
      </div>

      {/* Time rules */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-slate-600">כמות חיילים נדרשת לפי שעה</p>
          <button
            type="button"
            onClick={addRule}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
          >
            <Plus className="w-3.5 h-3.5" /> הוסף כלל
          </button>
        </div>
        {editingRules.length === 0 && (
          <p className="text-xs text-slate-400">ברירת מחדל: 1 חייל בכל שעות</p>
        )}
        {editingRules.map((r, i) => (
          <div key={i} className="flex items-center gap-2 mt-1.5">
            <select
              value={r.from_hour}
              onChange={e => updateRule(i, { from_hour: parseInt(e.target.value) })}
              className="input text-xs py-1 w-24"
            >
              {HOUR_OPTIONS.map(h => (
                <option key={h} value={h}>{String(h).padStart(2,'0')}:00</option>
              ))}
            </select>
            <span className="text-xs text-slate-400">עד</span>
            <select
              value={r.to_hour}
              onChange={e => updateRule(i, { to_hour: parseInt(e.target.value) })}
              className="input text-xs py-1 w-24"
            >
              {HOUR_OPTIONS.map(h => (
                <option key={h} value={h}>{String(h).padStart(2,'0')}:00</option>
              ))}
            </select>
            <span className="text-xs text-slate-400">כמות:</span>
            <input
              type="number" min={1} max={10}
              value={r.required_count}
              onChange={e => updateRule(i, { required_count: parseInt(e.target.value) || 1 })}
              className="input text-xs py-1 w-16"
            />
            <button type="button" onClick={() => removeRule(i)} className="text-red-400 hover:text-red-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onSave}
          disabled={isPending || !form.name.trim()}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Save className="w-4 h-4" />
          {isPending ? 'שומר...' : 'שמור'}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition-colors"
        >
          ביטול
        </button>
      </div>
    </div>
  )
}
