'use client'

import { useState, useTransition, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Wand2, Save, Lock, Unlock, Plus, X, AlertCircle } from 'lucide-react'
import {
  generateSlots,
  autoSchedule,
  type AlgoPosition,
  type AlgoTimeRule,
  type AlgoSoldier,
  type AlgoBlackout,
  type AlgoSlot,
  type AlgoAssignment,
} from '@/lib/schedule-algorithm'

interface DutyPosition {
  id: number; name: string; category: string
  shift_duration_hours: number; fixed_shift_starts: string[] | null
  rest_hours_after: number; pre_buffer_hours: number
  requires_qualification: boolean; is_standby: boolean
  standby_blocks_all: boolean; display_order: number; color: string
}
interface TimeRule { id: number; position_id: number; from_hour: number; to_hour: number; required_count: number }
interface Soldier { id: number; full_name: string; rank: string; department_id: number | null; isPresent: boolean; qualifications: number[]; pastCount: number }
interface Assignment { id?: number; schedule_day_id: number; position_id: number; slot_start: string; slot_end: string; soldier_id: number; source: string; notes?: string | null }
interface Blackout { id?: number; schedule_day_id: number; position_id: number; from_time: string; to_time: string; reason: string | null }

interface Props {
  date: string
  positions: DutyPosition[]
  timeRules: TimeRule[]
  soldiers: Soldier[]
  assignments: Assignment[]
  blackouts: Blackout[]
  scheduleDayId: number | null
  scheduleDayStatus: string | null
  canEdit: boolean
}

const COLOR_BG: Record<string, string> = {
  slate: 'bg-slate-100 border-slate-300', blue: 'bg-blue-50 border-blue-300',
  amber: 'bg-amber-50 border-amber-300', emerald: 'bg-emerald-50 border-emerald-300',
  red: 'bg-red-50 border-red-300', purple: 'bg-purple-50 border-purple-300',
}
const COLOR_HEADER: Record<string, string> = {
  slate: 'bg-slate-200 text-slate-700', blue: 'bg-blue-100 text-blue-700',
  amber: 'bg-amber-100 text-amber-700', emerald: 'bg-emerald-100 text-emerald-700',
  red: 'bg-red-100 text-red-600', purple: 'bg-purple-100 text-purple-700',
}

const fmt = (iso: string) => {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

const fmtDateShort = (iso: string) => {
  const d = new Date(iso)
  return `${d.getDate()}/${d.getMonth()+1} ${String(d.getHours()).padStart(2,'0')}:00`
}

// Key for an assignment cell
const cellKey = (posId: number, start: string, seat: number) => `${posId}__${start}__${seat}`

export default function ScheduleGrid({
  date, positions, timeRules, soldiers, assignments: initialAssignments,
  blackouts: initialBlackouts, scheduleDayId: initialDayId,
  scheduleDayStatus: initialStatus, canEdit,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments)
  const [blackouts, setBlackouts] = useState<Blackout[]>(initialBlackouts)
  const [dayId, setDayId] = useState(initialDayId)
  const [dayStatus, setDayStatus] = useState(initialStatus)
  const [saved, setSaved] = useState(false)
  const [showBlackoutForm, setShowBlackoutForm] = useState(false)
  const [blackoutDraft, setBlackoutDraft] = useState({ position_id: positions[0]?.id ?? 0, from_time: '', to_time: '', reason: '' })

  const isPublished = dayStatus === 'published'
  const isReadOnly  = isPublished || !canEdit

  // Generate all slots
  const slots: AlgoSlot[] = useMemo(() => {
    return generateSlots(date, positions as AlgoPosition[], timeRules as AlgoTimeRule[], blackouts.map(b => ({
      position_id: b.position_id,
      from_time: b.from_time,
      to_time: b.to_time,
    })))
  }, [date, positions, timeRules, blackouts])

  // Group slots by position, then by slot_start
  const slotsByPosition = useMemo(() => {
    const map = new Map<number, Map<string, AlgoSlot[]>>()
    for (const slot of slots) {
      if (!map.has(slot.position_id)) map.set(slot.position_id, new Map())
      const byStart = map.get(slot.position_id)!
      if (!byStart.has(slot.slot_start)) byStart.set(slot.slot_start, [])
      byStart.get(slot.slot_start)!.push(slot)
    }
    return map
  }, [slots])

  // Assignment lookup: posId + slot_start + seat -> soldier_id
  const assignmentMap = useMemo(() => {
    const map = new Map<string, number>()
    // Group assignments by posId+start, then fill seats in order
    const grouped = new Map<string, Assignment[]>()
    for (const a of assignments) {
      const k = `${a.position_id}__${a.slot_start}`
      if (!grouped.has(k)) grouped.set(k, [])
      grouped.get(k)!.push(a)
    }
    for (const [k, arr] of grouped.entries()) {
      arr.forEach((a, seat) => map.set(`${k}__${seat}`, a.soldier_id))
    }
    return map
  }, [assignments])

  const setCell = (posId: number, slotStart: string, slotEnd: string, seat: number, soldierId: number | null) => {
    setSaved(false)
    setAssignments(prev => {
      // Remove existing assignment at this seat
      const grouped = new Map<string, Assignment[]>()
      for (const a of prev) {
        const k = `${a.position_id}__${a.slot_start}`
        if (!grouped.has(k)) grouped.set(k, [])
        grouped.get(k)!.push(a)
      }
      const k = `${posId}__${slotStart}`
      const arr = grouped.get(k) ?? []
      // Replace seat
      const newArr = [...arr]
      if (soldierId !== null) {
        newArr[seat] = { schedule_day_id: dayId ?? 0, position_id: posId, slot_start: slotStart, slot_end: slotEnd, soldier_id: soldierId, source: 'manual' }
      } else {
        newArr.splice(seat, 1)
      }
      // Rebuild full list
      const other = prev.filter(a => !(a.position_id === posId && a.slot_start === slotStart))
      return [...other, ...newArr.filter(Boolean)]
    })
  }

  // Eligible soldiers for a slot/position
  const eligibleSoldiers = (pos: DutyPosition, slotStart: string) => {
    return soldiers.filter(s => {
      if (!s.isPresent) return false
      if (pos.requires_qualification && !s.qualifications.includes(pos.id)) return false
      return true
    })
  }

  // Check rest violation: soldier assigned too soon after a previous slot
  const hasRestViolation = (soldierId: number, slotStart: string): boolean => {
    const slotStartMs = new Date(slotStart).getTime()
    return assignments.some(a => {
      if (a.soldier_id !== soldierId) return false
      const pos = positions.find(p => p.id === a.position_id)
      if (!pos) return false
      const endMs = new Date(a.slot_end).getTime()
      const restMs = pos.rest_hours_after * 3600_000
      return slotStartMs > new Date(a.slot_start).getTime() && slotStartMs < endMs + restMs
    })
  }

  // Auto-schedule
  const handleAutoSchedule = () => {
    const algoSoldiers: AlgoSoldier[] = soldiers
      .filter(s => s.isPresent)
      .map(s => ({ id: s.id, full_name: s.full_name, qualifications: s.qualifications, pastCount: s.pastCount }))

    const algoBlackouts: AlgoBlackout[] = blackouts.map(b => ({
      position_id: b.position_id,
      from_time: b.from_time,
      to_time: b.to_time,
    }))

    const newAssignments = autoSchedule(slots, algoSoldiers, positions as AlgoPosition[])
    setAssignments(newAssignments.map(a => ({
      schedule_day_id: dayId ?? 0,
      position_id: a.position_id,
      slot_start: a.slot_start,
      slot_end: a.slot_end,
      soldier_id: a.soldier_id,
      source: 'auto',
    })))
    setSaved(false)
  }

  // Save to DB
  const handleSave = () => {
    setSaved(false)
    startTransition(async () => {
      const supabase = createClient()

      // Ensure schedule_day exists
      let currentDayId = dayId
      if (!currentDayId) {
        const { data } = await supabase
          .from('schedule_days')
          .insert({ date, status: 'draft' })
          .select()
          .single()
        if (!data) return
        currentDayId = data.id
        setDayId(data.id)
        setDayStatus('draft')
      }

      // Delete all existing assignments for this day and re-insert
      await supabase.from('shift_assignments').delete().eq('schedule_day_id', currentDayId)
      if (assignments.length > 0) {
        await supabase.from('shift_assignments').insert(
          assignments.map(a => ({
            schedule_day_id: currentDayId,
            position_id: a.position_id,
            slot_start: a.slot_start,
            slot_end: a.slot_end,
            soldier_id: a.soldier_id,
            source: a.source,
            notes: a.notes ?? null,
          }))
        )
      }

      setSaved(true)
      router.refresh()
    })
  }

  // Toggle publish
  const handleTogglePublish = () => {
    startTransition(async () => {
      const supabase = createClient()
      const newStatus = isPublished ? 'draft' : 'published'
      if (dayId) {
        await supabase.from('schedule_days').update({ status: newStatus }).eq('id', dayId)
        setDayStatus(newStatus)
      }
    })
  }

  // Add blackout
  const handleAddBlackout = () => {
    if (!blackoutDraft.from_time || !blackoutDraft.to_time) return
    startTransition(async () => {
      const supabase = createClient()

      let currentDayId = dayId
      if (!currentDayId) {
        const { data } = await supabase
          .from('schedule_days')
          .insert({ date, status: 'draft' })
          .select().single()
        if (!data) return
        currentDayId = data.id
        setDayId(data.id)
      }

      const { data } = await supabase
        .from('schedule_blackouts')
        .insert({
          schedule_day_id: currentDayId,
          position_id: blackoutDraft.position_id,
          from_time: blackoutDraft.from_time,
          to_time: blackoutDraft.to_time,
          reason: blackoutDraft.reason || null,
        })
        .select().single()

      if (data) {
        setBlackouts(prev => [...prev, data])
        setShowBlackoutForm(false)
        setBlackoutDraft({ position_id: positions[0]?.id ?? 0, from_time: '', to_time: '', reason: '' })
      }
    })
  }

  const removeBlackout = (id: number) => {
    startTransition(async () => {
      const supabase = createClient()
      await supabase.from('schedule_blackouts').delete().eq('id', id)
      setBlackouts(prev => prev.filter(b => b.id !== id))
    })
  }

  // Count assignments per soldier for fairness display
  const assignmentCountBySoldier = useMemo(() => {
    const map: Record<number, number> = {}
    for (const a of assignments) map[a.soldier_id] = (map[a.soldier_id] ?? 0) + 1
    return map
  }, [assignments])

  const presentSoldiers = soldiers.filter(s => s.isPresent)

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-slate-100 p-4 flex flex-wrap items-center gap-2">
        {!isReadOnly && (
          <>
            <button
              onClick={handleAutoSchedule}
              disabled={isPending || positions.length === 0 || presentSoldiers.length === 0}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-40 transition-colors"
            >
              <Wand2 className="w-4 h-4" />
              שיבוץ אוטומטי
            </button>
            <button
              onClick={handleSave}
              disabled={isPending}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
            >
              <Save className="w-4 h-4" />
              {isPending ? 'שומר...' : 'שמור'}
            </button>
            <button
              onClick={() => setShowBlackoutForm(v => !v)}
              className="flex items-center gap-2 text-slate-600 border border-slate-200 px-3 py-2 rounded-lg text-sm hover:bg-slate-50 transition-colors"
            >
              <X className="w-4 h-4" /> חלון שחור
            </button>
          </>
        )}
        {dayId && (
          <button
            onClick={handleTogglePublish}
            disabled={isPending}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors ${
              isPublished
                ? 'border-amber-300 text-amber-700 hover:bg-amber-50'
                : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            {isPublished ? <><Unlock className="w-4 h-4" /> בטל פרסום</> : <><Lock className="w-4 h-4" /> פרסם</>}
          </button>
        )}
        {saved && <span className="text-xs text-emerald-600 font-medium mr-2">נשמר ✓</span>}
        {isPublished && <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded-full">מפורסם — לקריאה בלבד</span>}
      </div>

      {/* Blackout form */}
      {showBlackoutForm && (
        <div className="bg-white rounded-xl border-2 border-orange-200 p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-700">הוסף חלון שחור (עמדה לא פעילה)</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <label className="block text-xs text-slate-500 mb-1">עמדה</label>
              <select
                value={blackoutDraft.position_id}
                onChange={e => setBlackoutDraft(d => ({ ...d, position_id: parseInt(e.target.value) }))}
                className="input w-full text-sm"
              >
                {positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">סיבה</label>
              <input
                value={blackoutDraft.reason}
                onChange={e => setBlackoutDraft(d => ({ ...d, reason: e.target.value }))}
                placeholder="כיסוי מפלוגה אחרת..."
                className="input w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">מ-</label>
              <input type="datetime-local" value={blackoutDraft.from_time.slice(0,16)} onChange={e => setBlackoutDraft(d => ({ ...d, from_time: new Date(e.target.value).toISOString() }))} className="input w-full text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">עד-</label>
              <input type="datetime-local" value={blackoutDraft.to_time.slice(0,16)} onChange={e => setBlackoutDraft(d => ({ ...d, to_time: new Date(e.target.value).toISOString() }))} className="input w-full text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAddBlackout} disabled={isPending} className="bg-orange-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-orange-600 disabled:opacity-40">הוסף</button>
            <button onClick={() => setShowBlackoutForm(false)} className="text-slate-500 px-3 py-1.5 rounded-lg text-sm hover:bg-slate-100">ביטול</button>
          </div>
        </div>
      )}

      {/* Active blackouts */}
      {blackouts.length > 0 && (
        <div className="bg-orange-50 rounded-xl border border-orange-200 p-3 space-y-1.5">
          <p className="text-xs font-semibold text-orange-700 mb-1">חלונות שחורים פעילים</p>
          {blackouts.map(b => {
            const pos = positions.find(p => p.id === b.position_id)
            return (
              <div key={b.id} className="flex items-center gap-2 text-xs text-orange-700">
                <span className="font-medium">{pos?.name ?? b.position_id}</span>
                <span>{fmtDateShort(b.from_time)} — {fmtDateShort(b.to_time)}</span>
                {b.reason && <span className="text-orange-500">({b.reason})</span>}
                {!isReadOnly && b.id && (
                  <button onClick={() => removeBlackout(b.id!)} className="text-orange-400 hover:text-orange-600 mr-auto">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* No positions */}
      {positions.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-100 py-12 text-center text-slate-400">
          לא הוגדרו עמדות פעילות. <a href="/ops/duty-types" className="text-blue-600 hover:underline">הגדר עמדות</a>
        </div>
      )}

      {/* Per-position grids */}
      {positions.map(pos => {
        const posSlotsByStart = slotsByPosition.get(pos.id)
        if (!posSlotsByStart || posSlotsByStart.size === 0) return null

        const sortedStarts = [...posSlotsByStart.keys()].sort()
        const headerCls = COLOR_HEADER[pos.color] ?? COLOR_HEADER.slate

        return (
          <div key={pos.id} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Position header */}
            <div className={`px-4 py-2.5 flex items-center gap-2 ${headerCls}`}>
              <span className="font-semibold text-sm">{pos.name}</span>
              <span className="text-xs opacity-70">
                {pos.shift_duration_hours}ש' · מנוחה {pos.rest_hours_after}ש'
                {pos.requires_qualification && ' · דורש הסמכה'}
                {pos.is_standby && (pos.standby_blocks_all ? ' · כוננות חוסמת' : ' · כוננות')}
              </span>
            </div>

            {/* Slot rows */}
            <div className="divide-y divide-slate-50">
              {sortedStarts.map(start => {
                const slotsForStart = posSlotsByStart.get(start)!
                const seatCount = slotsForStart.length
                const end = slotsForStart[0].slot_end
                const isNextDay = new Date(start).toDateString() !== new Date(`${date}T00:00:00`).toDateString()

                return (
                  <div key={start} className="flex items-center px-4 py-2 gap-3">
                    <div className="w-28 shrink-0 text-xs text-slate-500 font-mono">
                      {isNextDay && <span className="text-slate-300 text-xs mr-0.5">▶</span>}
                      {fmt(start)}–{fmt(end)}
                    </div>
                    <div className="flex flex-wrap gap-2 flex-1">
                      {Array.from({ length: seatCount }, (_, seat) => {
                        const currentSoldierId = assignmentMap.get(cellKey(pos.id, start, seat)) ?? null
                        const violation = currentSoldierId ? hasRestViolation(currentSoldierId, start) : false
                        const eligible = eligibleSoldiers(pos, start)

                        return (
                          <div key={seat} className="flex items-center gap-1">
                            {seatCount > 1 && (
                              <span className="text-xs text-slate-300 font-medium">{seat + 1}.</span>
                            )}
                            <div className="relative">
                              <select
                                value={currentSoldierId ?? ''}
                                onChange={e => setCell(pos.id, start, end, seat, e.target.value ? parseInt(e.target.value) : null)}
                                disabled={isReadOnly}
                                className={`border rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 min-w-[150px] ${
                                  violation ? 'border-red-300 bg-red-50' : 'border-slate-200'
                                }`}
                              >
                                <option value="">— פנוי —</option>
                                {eligible.map(s => (
                                  <option key={s.id} value={s.id}>
                                    {s.full_name}
                                    {(assignmentCountBySoldier[s.id] ?? 0) > 0
                                      ? ` (${assignmentCountBySoldier[s.id]})`
                                      : ''}
                                  </option>
                                ))}
                              </select>
                              {violation && (
                                <span title="הפרת זמן מנוחה" className="absolute -top-1 -left-1">
                                  <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Soldier summary */}
      {presentSoldiers.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs font-semibold text-slate-500 mb-3">נוכחים ביום זה ({presentSoldiers.length})</p>
          <div className="flex flex-wrap gap-2">
            {presentSoldiers.map(s => {
              const count = assignmentCountBySoldier[s.id] ?? 0
              return (
                <div
                  key={s.id}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${
                    count === 0 ? 'bg-slate-50 border-slate-200 text-slate-400' : 'bg-blue-50 border-blue-200 text-blue-700'
                  }`}
                >
                  <span>{s.full_name}</span>
                  {count > 0 && <span className="font-bold">{count}</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
