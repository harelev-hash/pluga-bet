'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Check, Clock, X, ExternalLink, Save, Lock } from 'lucide-react'

interface MelmItem {
  id: number
  item_kind: string | null
  quantity_requested: number
  notes: string | null
  free_text: string | null
  resap_status: string
  resap_notes: string | null
  resap_performed_at: string | null
  performerName: string | null
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
  closedByName: string | null
  closedAt: string | null
}

type ResapStatus = 'pending' | 'supplied' | 'long_term' | 'rejected'

const RESAP_STATUS_CONFIG: Record<ResapStatus, { label: string; icon: React.ReactNode; cls: string; activeCls: string }> = {
  pending:   { label: 'ממתין',      icon: null,                              cls: 'text-slate-400 border-slate-200 hover:border-slate-300', activeCls: 'bg-slate-100 text-slate-600 border-slate-300' },
  supplied:  { label: 'סופק',       icon: <Check className="w-3.5 h-3.5" />, cls: 'text-green-600 border-green-200 hover:bg-green-50',      activeCls: 'bg-green-100 text-green-700 border-green-300' },
  long_term: { label: 'טיפול ארוך', icon: <Clock className="w-3.5 h-3.5" />, cls: 'text-amber-600 border-amber-200 hover:bg-amber-50',     activeCls: 'bg-amber-100 text-amber-700 border-amber-300' },
  rejected:  { label: 'דחוי',       icon: <X className="w-3.5 h-3.5" />,    cls: 'text-red-500 border-red-200 hover:bg-red-50',           activeCls: 'bg-red-100 text-red-600 border-red-200' },
}

const KIND_COLORS: Record<string, string> = {
  wear:            'border-r-4 border-r-amber-400',
  missing_soldier: 'border-r-4 border-r-blue-400',
  missing_dept:    'border-r-4 border-r-emerald-400',
  free_text:       'border-r-4 border-r-slate-300',
}

const KIND_LABEL: Record<string, string> = {
  wear: 'בלאי לחייל', missing_soldier: 'ציוד חסר לחייל',
  missing_dept: 'ציוד למחלקה', free_text: 'מלל חופשי', equipment: 'ציוד',
}

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : null

export default function HandleClient({ requestId, initialStatus, items: initialItems, closedByName, closedAt }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [requestStatus, setRequestStatus] = useState(initialStatus)
  const [items, setItems] = useState(initialItems.map(i => ({
    ...i,
    resap_status: (i.resap_status ?? 'pending') as ResapStatus,
    resap_notes: i.resap_notes ?? '',
    wearDone: false,
    localChanged: false,  // tracks if changed in this session
  })))
  const [saved, setSaved] = useState(false)
  const [closing, setClosing] = useState(false)

  const isClosed = requestStatus === 'closed'

  const updateItem = (id: number, patch: Partial<typeof items[0]>) =>
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it))

  const changeStatus = (id: number, s: ResapStatus) => {
    const item = items.find(it => it.id === id)
    updateItem(id, {
      resap_status: item?.resap_status === s ? 'pending' : s,
      localChanged: true,
    })
  }

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
      const { data: { user } } = await supabase.auth.getUser()
      const now = new Date().toISOString()

      await Promise.all(items.map(it => {
        const update: Record<string, unknown> = {
          resap_status: it.resap_status,
          resap_notes: it.resap_notes || null,
        }
        // Record performer only for items changed in this session
        if (it.localChanged) {
          if (it.resap_status !== 'pending') {
            update.resap_performed_by = user?.id ?? null
            update.resap_performed_at = now
          } else {
            // Reset to pending — clear performer
            update.resap_performed_by = null
            update.resap_performed_at = null
          }
        }
        return supabase.from('melm_items').update(update).eq('id', it.id)
      }))

      await supabase
        .from('melm_requests')
        .update({ status: requestStatus })
        .eq('id', requestId)

      setSaved(true)
      router.refresh()
    })
  }

  const handleClose = () => {
    setClosing(true)
    startTransition(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const now = new Date().toISOString()

      // Save any pending item changes first
      const changedItems = items.filter(it => it.localChanged)
      if (changedItems.length > 0) {
        await Promise.all(changedItems.map(it => {
          const update: Record<string, unknown> = {
            resap_status: it.resap_status,
            resap_notes: it.resap_notes || null,
          }
          if (it.resap_status !== 'pending') {
            update.resap_performed_by = user?.id ?? null
            update.resap_performed_at = now
          }
          return supabase.from('melm_items').update(update).eq('id', it.id)
        }))
      }

      await supabase
        .from('melm_requests')
        .update({ status: 'closed', closed_by: user?.id ?? null, closed_at: now })
        .eq('id', requestId)

      setRequestStatus('closed')
      setClosing(false)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      {/* Closed banner */}
      {isClosed && (closedAt || closedByName) && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-slate-500">
          <Lock className="w-4 h-4 shrink-0" />
          <span>
            מל&quot;מ זה נסגר{formatDate(closedAt) ? ` ב-${formatDate(closedAt)}` : ''}
            {closedByName ? ` ע&quot;י ${closedByName}` : ''}
          </span>
        </div>
      )}

      {/* Items */}
      {items.map(item => {
        const kind = item.item_kind ?? 'equipment'

        return (
          <div
            key={item.id}
            className={`bg-white rounded-xl shadow-sm border border-slate-100 p-4 space-y-3 ${KIND_COLORS[kind] ?? ''}`}
          >
            {/* Top row */}
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
                        ? <>{item.type?.name ?? '—'}{item.assignment.item?.serial_number && <span className="text-slate-400 font-mono text-xs mr-1">#{item.assignment.item.serial_number}</span>}</>
                        : (item.type?.name ?? '—')
                      }
                    </>
                  )}
                  {kind === 'missing_soldier' && (
                    <>{item.soldier?.full_name ?? '—'}{' — '}{item.type?.name ?? item.free_text ?? '—'}{item.quantity_requested > 1 && <span className="text-slate-400 text-sm"> ×{item.quantity_requested}</span>}</>
                  )}
                  {(kind === 'missing_dept' || kind === 'equipment') && (
                    <>{item.type?.name ?? item.free_text ?? '—'}{item.quantity_requested > 1 && <span className="text-slate-400 text-sm"> ×{item.quantity_requested}</span>}</>
                  )}
                </p>
                {item.notes && <p className="text-xs text-slate-400 mt-0.5">הערת סמל: {item.notes}</p>}
                {/* Performer attribution */}
                {item.performerName && item.resap_status !== 'pending' && (
                  <p className="text-xs text-slate-300 mt-0.5">
                    טופל ע&quot;י {item.performerName}
                    {item.resap_performed_at && <> · {formatDate(item.resap_performed_at)}</>}
                  </p>
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
                      disabled={isClosed}
                      onClick={() => changeStatus(item.id, s)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${isActive ? c.activeCls : c.cls}`}
                    >
                      {c.icon}<span>{c.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Quick actions */}
            {kind === 'wear' && item.assignment_id && !isClosed && (
              <div className="flex items-center gap-2">
                {item.wearDone
                  ? <span className="text-xs text-amber-600 font-medium flex items-center gap-1"><Check className="w-3.5 h-3.5" /> סומן כבלאי בהצלחה</span>
                  : <button type="button" onClick={() => markWear(item)} className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 border border-amber-200 hover:bg-amber-50 px-2.5 py-1 rounded-lg transition-colors">
                      עדכן בלאי ישירות
                    </button>
                }
              </div>
            )}

            {kind === 'missing_soldier' && item.soldier && (
              <a
                href={`/equipment/sign?soldier_id=${item.soldier.id}${item.type ? `&type_id=${item.type.id}` : ''}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 border border-blue-200 hover:bg-blue-50 px-2.5 py-1 rounded-lg transition-colors w-fit"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                פתח טופס החתמה לחייל
              </a>
            )}

            {/* Resap notes */}
            <input
              value={item.resap_notes}
              onChange={e => updateItem(item.id, { resap_notes: e.target.value, localChanged: true })}
              placeholder="הערת רספ (אופציונלי)..."
              disabled={isClosed}
              className="input w-full text-sm text-slate-500 bg-slate-50 disabled:opacity-50"
            />
          </div>
        )
      })}

      {/* Footer */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600 shrink-0">סטטוס:</label>
          <select
            value={requestStatus}
            onChange={e => setRequestStatus(e.target.value)}
            disabled={isClosed}
            className="input text-sm max-w-[160px] disabled:opacity-50"
          >
            <option value="open">פתוח</option>
            <option value="in_progress">בטיפול</option>
            <option value="resolved">טופל</option>
            <option value="closed">סגור</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {saved && <span className="text-xs text-emerald-600 font-medium">נשמר ✓</span>}

          {!isClosed && (
            <>
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4" />
                {isPending && !closing ? 'שומר...' : 'שמור'}
              </button>

              <button
                type="button"
                onClick={handleClose}
                disabled={isPending}
                className="flex items-center gap-2 bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                <Lock className="w-4 h-4" />
                {closing ? 'סוגר...' : 'סגור מל"מ'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
