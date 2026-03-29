import { createClient } from '@/lib/supabase/server'
import { getPermissions } from '@/lib/auth/server'
import { hasPermission } from '@/lib/permissions'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { todayISO, formatDate } from '@/lib/utils'
import ScheduleGrid from './schedule-grid'

interface Props { searchParams: Promise<{ date?: string }> }

export default async function SchedulePage({ searchParams }: Props) {
  const permissions = await getPermissions()
  if (!hasPermission(permissions, 'nav:ops')) redirect('/')
  const canEdit = hasPermission(permissions, 'ops:edit')

  const { date: dateParam } = await searchParams
  const date = dateParam ?? todayISO()

  const supabase = await createClient()

  const [
    { data: positions },
    { data: timeRules },
    { data: soldiers },
    { data: qualifications },
    { data: scheduleDay },
    { data: attendance },
  ] = await Promise.all([
    supabase.from('duty_positions').select('*').eq('is_active', true).order('display_order').order('name'),
    supabase.from('position_time_rules').select('*'),
    supabase.from('soldiers').select('id, full_name, rank, department_id').eq('is_active', true).order('full_name'),
    supabase.from('soldier_qualifications').select('soldier_id, position_id'),
    supabase.from('schedule_days').select('*').eq('date', date).maybeSingle(),
    supabase.from('daily_attendance').select('soldier_id, status').eq('date', date),
  ])

  // Get existing assignments for this day (if schedule day exists)
  let assignments: any[] = []
  let blackouts: any[] = []
  if (scheduleDay) {
    const [{ data: a }, { data: b }] = await Promise.all([
      supabase.from('shift_assignments').select('*').eq('schedule_day_id', scheduleDay.id),
      supabase.from('schedule_blackouts').select('*').eq('schedule_day_id', scheduleDay.id),
    ])
    assignments = a ?? []
    blackouts = b ?? []
  }

  // Present soldiers: those with attendance status 'present' (or no record = assume present)
  const presentIds = new Set<number>()
  const attendanceMap = new Map((attendance ?? []).map((a: any) => [a.soldier_id, a.status]))
  for (const s of soldiers ?? []) {
    const status = attendanceMap.get(s.id)
    // Include if present or no attendance record
    if (!status || status === 'present') presentIds.add(s.id)
  }

  // Lookback assignment counts (last 7 days)
  const lookbackDate = new Date(date)
  lookbackDate.setDate(lookbackDate.getDate() - 7)
  const { data: pastDays } = await supabase
    .from('schedule_days')
    .select('id')
    .gte('date', lookbackDate.toISOString().slice(0, 10))
    .lt('date', date)

  const pastDayIds = (pastDays ?? []).map((d: any) => d.id)
  let pastCounts: Record<number, number> = {}
  if (pastDayIds.length > 0) {
    const { data: pastAssignments } = await supabase
      .from('shift_assignments')
      .select('soldier_id')
      .in('schedule_day_id', pastDayIds)
    for (const a of pastAssignments ?? []) {
      pastCounts[a.soldier_id] = (pastCounts[a.soldier_id] ?? 0) + 1
    }
  }

  // Qualify soldiers for positions
  const qualMap: Record<number, number[]> = {}
  for (const q of qualifications ?? []) {
    if (!qualMap[q.soldier_id]) qualMap[q.soldier_id] = []
    qualMap[q.soldier_id].push(q.position_id)
  }

  const enrichedSoldiers = (soldiers ?? []).map((s: any) => ({
    ...s,
    isPresent: presentIds.has(s.id),
    qualifications: qualMap[s.id] ?? [],
    pastCount: pastCounts[s.id] ?? 0,
  }))

  return (
    <div className="max-w-5xl mx-auto space-y-5" dir="rtl">
      <div className="flex items-center gap-3">
        <Link href="/ops" className="text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">שיבוץ יומי</h1>
          <p className="text-slate-500 text-sm mt-0.5">{formatDate(date)}</p>
        </div>
      </div>

      {/* Date picker */}
      <div className="bg-white rounded-xl border border-slate-100 p-4">
        <form className="flex gap-3">
          <input
            type="date"
            name="date"
            defaultValue={date}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            טען
          </button>
        </form>
      </div>

      <ScheduleGrid
        date={date}
        positions={positions ?? []}
        timeRules={timeRules ?? []}
        soldiers={enrichedSoldiers}
        assignments={assignments}
        blackouts={blackouts}
        scheduleDayId={scheduleDay?.id ?? null}
        scheduleDayStatus={scheduleDay?.status ?? null}
        canEdit={canEdit}
      />
    </div>
  )
}
