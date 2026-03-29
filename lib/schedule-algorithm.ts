/**
 * Auto-scheduling algorithm for daily duty assignments.
 *
 * A "schedule day" runs from 07:00 on `date` through 13:00 the next day (30h).
 * The algorithm fills each required slot greedily, prioritising soldiers who
 * have the fewest assignments in the lookback window.
 */

export interface AlgoPosition {
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
}

export interface AlgoTimeRule {
  position_id: number
  from_hour: number   // 0–23
  to_hour: number     // 0–23  (from > to means wraps midnight)
  required_count: number
}

export interface AlgoSoldier {
  id: number
  full_name: string
  qualifications: number[] // position_ids
  pastCount: number        // assignments in the lookback window
}

export interface AlgoBlackout {
  position_id: number
  from_time: string  // ISO
  to_time: string    // ISO
}

export interface AlgoSlot {
  position_id: number
  slot_start: string  // ISO
  slot_end: string    // ISO
  required_count: number
}

export interface AlgoAssignment {
  position_id: number
  slot_start: string
  slot_end: string
  soldier_id: number
  source: 'auto'
}

/** Generate all required slots for a schedule day */
export function generateSlots(
  date: string,  // YYYY-MM-DD  (day starts 07:00)
  positions: AlgoPosition[],
  timeRules: AlgoTimeRule[],
  blackouts: AlgoBlackout[],
): AlgoSlot[] {
  const dayStart = new Date(`${date}T07:00:00`)
  const dayEnd   = new Date(dayStart)
  dayEnd.setHours(dayEnd.getHours() + 30)  // 13:00 next day

  const slots: AlgoSlot[] = []

  for (const pos of positions) {
    if (!pos) continue
    const durMs = pos.shift_duration_hours * 3600_000

    // Build list of slot starts
    const starts: Date[] = []
    if (pos.fixed_shift_starts?.length) {
      // Fixed starts — generate for today and tomorrow to cover the 30h window
      for (const dayOffset of [0, 1]) {
        const base = new Date(dayStart)
        base.setDate(base.getDate() + dayOffset - (dayStart.getHours() >= 7 ? 0 : 1))
        // reset to midnight of the relevant day
        const dayMidnight = new Date(base)
        dayMidnight.setHours(0, 0, 0, 0)

        for (const t of pos.fixed_shift_starts) {
          const [h, m] = t.split(':').map(Number)
          const start = new Date(dayMidnight)
          start.setHours(h, m || 0, 0, 0)
          starts.push(start)
        }
      }
    } else {
      // Rolling — start at dayStart, step by durMs
      let cursor = new Date(dayStart)
      while (cursor < dayEnd) {
        starts.push(new Date(cursor))
        cursor = new Date(cursor.getTime() + durMs)
      }
    }

    for (const start of starts) {
      const end = new Date(start.getTime() + durMs)
      // Keep only slots that overlap the 30h window
      if (end <= dayStart || start >= dayEnd) continue

      const slotStartISO = start.toISOString()
      const slotEndISO   = end.toISOString()

      // Skip if fully covered by a blackout
      const blocked = blackouts.some(b =>
        b.position_id === pos.id &&
        b.from_time <= slotStartISO &&
        b.to_time   >= slotEndISO
      )
      if (blocked) continue

      // How many soldiers are required at slot start?
      const slotHour = start.getHours()
      const rulesForPos = timeRules.filter(r => r.position_id === pos.id)
      let requiredCount = 1  // default
      if (rulesForPos.length > 0) {
        const match = rulesForPos.find(r => hourInRange(slotHour, r.from_hour, r.to_hour))
        if (match) requiredCount = match.required_count
      }

      for (let seat = 0; seat < requiredCount; seat++) {
        slots.push({
          position_id: pos.id,
          slot_start: slotStartISO,
          slot_end: slotEndISO,
          required_count: requiredCount,
        })
      }
    }
  }

  return slots
}

function hourInRange(h: number, from: number, to: number): boolean {
  if (from === to) return true  // all-day rule (from_hour == to_hour == 0)
  if (from < to) return h >= from && h < to
  // wraps midnight
  return h >= from || h < to
}

/** Run the greedy assignment algorithm */
export function autoSchedule(
  slots: AlgoSlot[],
  soldiers: AlgoSoldier[],
  positions: AlgoPosition[],
): AlgoAssignment[] {
  const posMap = new Map(positions.map(p => [p.id, p]))
  const results: AlgoAssignment[] = []

  // Track per-soldier: when their rest period ends + current session assignment count
  const restEndsAt = new Map<number, Date>()
  const sessionCount = new Map<number, number>(soldiers.map(s => [s.id, 0]))

  // Track which soldiers are in blocking standbys (for the whole window)
  // — standby assignments need to be resolved first if they exist;
  //   for auto-schedule we just exclude those marked as blocking standbys
  //   from other assignments when they're scheduled into a standby slot.
  const blockingSoldiers = new Set<number>()

  // Sort slots chronologically
  const sorted = [...slots].sort((a, b) => a.slot_start.localeCompare(b.slot_start))

  for (const slot of sorted) {
    const pos = posMap.get(slot.position_id)
    if (!pos) continue

    const slotStart = new Date(slot.slot_start)
    const slotEnd   = new Date(slot.slot_end)

    // Eligible soldiers for this slot
    const eligible = soldiers.filter(s => {
      // Qualification check
      if (pos.requires_qualification && !s.qualifications.includes(pos.id)) return false
      // Not in a blocking standby
      if (blockingSoldiers.has(s.id) && !pos.is_standby) return false
      // Rest period
      const restEnd = restEndsAt.get(s.id)
      if (restEnd && slotStart < restEnd) return false
      // Pre-buffer: soldier must be free for pre_buffer_hours before this slot
      if (pos.pre_buffer_hours > 0) {
        const bufferStart = new Date(slotStart.getTime() - pos.pre_buffer_hours * 3600_000)
        const restEndMs = restEnd?.getTime() ?? 0
        if (restEndMs > bufferStart.getTime()) return false
      }
      // Not already assigned to this exact slot
      const alreadyInSlot = results.some(
        r => r.soldier_id === s.id &&
          r.slot_start === slot.slot_start &&
          r.slot_end   === slot.slot_end
      )
      if (alreadyInSlot) return false
      return true
    })

    if (eligible.length === 0) continue

    // Sort by: session count ASC, then past count ASC, then random
    eligible.sort((a, b) => {
      const sc = (sessionCount.get(a.id) ?? 0) - (sessionCount.get(b.id) ?? 0)
      if (sc !== 0) return sc
      return a.pastCount - b.pastCount
    })

    const chosen = eligible[0]

    results.push({
      position_id: slot.position_id,
      slot_start: slot.slot_start,
      slot_end: slot.slot_end,
      soldier_id: chosen.id,
      source: 'auto',
    })

    sessionCount.set(chosen.id, (sessionCount.get(chosen.id) ?? 0) + 1)

    // Set rest-ends-at
    const restEnd = new Date(slotEnd.getTime() + pos.rest_hours_after * 3600_000)
    const existing = restEndsAt.get(chosen.id)
    if (!existing || restEnd > existing) {
      restEndsAt.set(chosen.id, restEnd)
    }

    // If standby blocks all, mark soldier as blocked
    if (pos.is_standby && pos.standby_blocks_all) {
      blockingSoldiers.add(chosen.id)
    }
  }

  return results
}
