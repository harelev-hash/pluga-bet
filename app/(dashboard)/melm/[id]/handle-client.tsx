'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Check, Clock, X, ExternalLink, ChevronDown, Save } from 'lucide-react'

interface MelmItem {
  id: number
  item_kind: string | null
  quantity_requested: number
  notes: string | null
  free_text: string | null
  resap_status: string
  resap_notes: string | null
  assignment_id: number | null
  soldier: { id: number; full_name: string; rank: string } | null
  type: { id: number; name: string } | null
  assignment: {
    id: number
    condition_in: string
    attribute: string | null
    item: { serial_number: string | null } | null
  } | null
}

interface Props {
  requestId: number
  initialStatus: string
  items: MelmItem[]
}

type ResapStatus = 'pending' | 'supplied' | 'long_term' | 'rejected'

const REQUEST_STATUS_LABELS: Record<string, string> = {
  open: 'פתוח',
  in_progress: 'בטיפול',
  resolved: 'טופל',
  closed: 'סגור',
}

const RESAP_STATUS_CONFIG: Record<ResapStatus, { label: string; icon: React.ReactNode; cls: string; activeCls: string }> = {
  pending:   { label: 'ממתין',       icon: null,                             cls: 'text-slate-400 border-slate-200 hover:border-slate-300', activeCls: 'bg-slate-100 text-slate-600 border-slate-300' },
  supplied:  { label: 'סופק',        icon: <Check className="w-3.5 h-3.5" />, cls: 'text-green-600 border-green-200 hover:bg-green-50',      activeCls: 'bg-green-100 text-green-700 border-green-300' },
  long_term: { label: 'טיפול ארוך',  icon: <Clock className="w-3.5 h-3.5" />, cls: 'text-amber-600 border-amber-200 hover:bg-amber-50',     activeCls: 'bg-amber-100 text-amber-700 border-amber-300' },
  rejected:  { label: 'דחוי',        icon: <X className="w-3.5 h-3.5" />,    cls: 'text-red-500 border-red-200 hover:bg-red-50',           activeCls: 'bg-red-100 text-red-600 border-red-200' },
}

const KIND_COLORS: Record<string, string> = {
  wear:            'border-r-4 border-r-amber-400',
  missing_soldier: 'border-r-4 border-r-blue-400',
  missing_dept:    'border-r-4 border-r-emerald-400',
  free_text:       'border-r-4 border-r-slate-300',
}

const KIND_LABEL: Record<string, string> = {
  wear: 'בלאי לחייל',
  missing_soldier: 'ציוד חסר לחייל',
  missing_dept: 'ציוד למחלקה',
  free_text: 'מלל חופשי',
  equipment: 'ציוד',
}

export default function HandleClient({ requestId, initialStatus, items: initialItems }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [requestStatus, setRequestStatus] = useState(initialStatus)
  const [items, setItems] = useState(initialItems.map(i => ({
    ...i,
    resap_status: (i.resap_status ?? 'pending') as ResapStatus,
    resap_notes: i.resap_notes ?? '',
    wearDone: false,
  })))
  const [saved, setSaved] = useState(false)

  const updateItem = (id: number, patch: Partial<typeof items[0]>) =>
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it))

  const markWear = async (item: typeof items[0]) => {
    if (!item.assignment_id) return
    const supabase = createClient()
    const { error } = await supabase
      .from('equipment_assignments')
      .update({ condition_in: 'worn' })
      .eq('id', item.assignment_id)
    if (!error) updateItem(item.id, { wearDone: true })
  }

  const handleSave = () => {
    setSaved(false)
    startTransition(async () => {
      const supabase = createClient()

      // Update each item's resap_status and resap_notes
      await Promise.all(items.map(it =>
        supabase
          .from('melm_items')
          .update({ resap_status: it.resap_status, resap_notes: it.resap_notes || null })
          .eq('id', it.id)
      ))

      // Update request status
      await supabase
        .from('melm_requests')
        .update({ status: requestStatus })
        .eq('id', requestId)

      setSaved(true)
      router.refresh()
    })
  }

  const allDone = items.every(i => i.resap_status !== 'pending')

  return (
    <div className="space-y-4">
      {/* Items */}
      {items.map(item => {
        const kind = item.item_kind ?? 'equipment'
        const cfg = RESAP_STATUS_CONFIG[item.resap_status as ResapStatus] ?? RESAP_STATUS_CONFIG.pending

        return (
          <div
            key={item.id}
            className={`bg-white rounded-xl shadow-sm border border-slate-100 p-4 space-y-3 ${KIND_COLORS[kind] ?? ''}`}
          >
            {/* Top row: kind label + item description */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  {KIND_LABEL[kind] ?? kind}
                </span>
                <p className="text-slate-800 font-medium mt-0.5">
                  {kind === 'free_text' && (item.free_text ?? '—')}
                  {kind === 'wear' && (
                    <>
                      {item.soldier?.full_name ?? '—'}
                      {' — '}
                      {item.assignment
                        ? <>
                            {item.type?.name ?? '—'}
                            {item.assignment.item?.serial_number && <span className="text-slate-400 font-mono text-xs mr-1">#{item.assignment.item.serial_number}</span>}
                          </>
                        : (item.type?.name ?? '—')
                      }
                    </>
                  )}
                  {kind === 'missing_soldier' && (
                    <>
                      {item.soldier?.full_name ?? '—'}
                      {' — '}
                      {item.type?.name ?? item.free_text ?? '—'}
                      {item.quantity_requested > 1 && <span className="text-slate-400 text-sm"> ×{item.quantity_requested}</span>}
                    </>
                  )}
                  {(kind === 'missing_dept' || kind === 'equipment') && (
                    <>
                      {item.type?.name ?? item.free_text ?? '—'}
                      {item.quantity_requested > 1 && <span className="text-slate-400 text-sm"> ×{item.quantity_requested}</span>}
                    </>
                  )}
                </p>
                {item.notes && (
                  <p className="text-xs text-slate-400 mt-0.5">הערת סמל: {item.notes}</p>
                )}
              </div>

              {/* Resap status buttons */}
              <div className="flex items-center gap-1 shrink-0">
                {(['supplied', 'long_term', 'rejected'] as ResapStatus[]).map(s => {
                  const c = RESAP_STATUS_CONFIG[s]
                  const isActive = item.resap_status === s
                  return (
                    <button
                      key={s}
                      type="button"
                      title={c.label}
                      onClick={() => updateItem(item.id, { resap_status: isActive ? 'pending' : s })}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${isActive ? c.activeCls : c.cls}`}
                    >
                      {c.icon}
                      <span>{c.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Quick actions for wear / missing_soldier */}
            {kind === 'wear' && item.assignment_id && (
              <div className="flex items-center gap-2">
                {item.wearDone ? (
                  <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> סומן כבלאי בהצלחה
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => markWear(item)}
                    className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 border border-amber-200 hover:bg-amber-50 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    עדכן בלאי ישירות
                  </button>
                )}
              </div>
            )}

            {kind === 'missing_soldier' && item.soldier && (
              <div>
                <a
                  href={`/equipment/sign?soldier_id=${item.soldier.id}${item.type ? `&type_id=${item.type.id}` : ''}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 border border-blue-200 hover:bg-blue-50 px-2.5 py-1 rounded-lg transition-colors w-fit"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  פתח טופס החתמה לחייל
                </a>
              </div>
            )}

            {/* Resap notes */}
            <div>
              <input
                value={item.resap_notes}
                onChange={e => updateItem(item.id, { resap_notes: e.target.value })}
                placeholder="הערת רספ (אופציונלי)..."
                className="input w-full text-sm text-slate-500 bg-slate-50"
              />
            </div>
          </div>
        )
      })}

      {/* Footer: request status + save */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex items-center gap-4">
        <div className="flex items-center gap-2 flex-1">
          <label className="text-sm font-medium text-slate-600 shrink-0">סטטוס בקשה:</label>
          <select
            value={requestStatus}
            onChange={e => setRequestStatus(e.target.value)}
            className="input text-sm flex-1 max-w-[180px]"
          >
            {Object.entries(REQUEST_STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          {allDone && requestStatus === 'open' && (
            <span className="text-xs text-emerald-600 flex items-center gap-1">
              <ChevronDown className="w-3.5 h-3.5" />
              כל הסעיפים טופלו — שקול לסגור
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {saved && <span className="text-xs text-emerald-600 font-medium">נשמר ✓</span>}
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            {isPending ? 'שומר...' : 'שמור'}
          </button>
        </div>
      </div>
    </div>
  )
}
