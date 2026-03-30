import { createClient } from '@/lib/supabase/server'
import { getPermissions } from '@/lib/auth/server'
import { hasPermission } from '@/lib/permissions'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, ChevronLeft, ChevronRight, Pencil } from 'lucide-react'
import { todayISO, formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

interface Props { searchParams: Promise<{ date?: string }> }

export default async function ScheduleViewPage({ searchParams }: Props) {
  const permissions = await getPermissions()
  if (!hasPermission(permissions, 'nav:ops')) redirect('/')
  const canEdit = hasPermission(permissions, 'ops:edit')

  const { date: dateParam } = await searchParams
  const date = dateParam ?? todayISO()

  const prev = new Date(date); prev.setDate(prev.getDate() - 1)
  const next = new Date(date); next.setDate(next.getDate() + 1)
  const prevStr = prev.toISOString().slice(0, 10)
  const nextStr = next.toISOString().slice(0, 10)

  const supabase = await createClient()

  const [
    { data: positions },
    { data: soldiers },
    { data: scheduleDay },
  ] = await Promise.all([
    supabase.from('duty_positions').select('id, name, color, shift_duration_hours').eq('is_active', true).order('display_order').order('name'),
    supabase.from('soldiers').select('id, full_name').eq('is_active', true),
    supabase.from('schedule_days').select('*').eq('date', date).maybeSingle(),
  ])

  let assignments: any[] = []
  if (scheduleDay) {
    const { data } = await supabase
      .from('shift_assignments')
      .select('position_id, slot_start, slot_end, soldier_id')
      .eq('schedule_day_id', scheduleDay.id)
    assignments = data ?? []
  }

  const soldierMap = new Map((soldiers ?? []).map((s: any) => [s.id, s.full_name]))
  const positionsList = positions ?? []

  // Build hourly rows: 07:00 on date through 13:00 on date+1 (30 hours)
  const dayStart = new Date(`${date}T07:00:00`)
  const rows: { label: string; hourDate: Date; isNextDay: boolean }[] = []
  for (let i = 0; i < 31; i++) {
    const h = new Date(dayStart.getTime() + i * 3600_000)
    const isNextDay = h.getDate() !== new Date(`${date}T07:00:00`).getDate()
    const hh = String(h.getHours()).padStart(2, '0')
    rows.push({ label: `${hh}:00`, hourDate: h, isNextDay })
  }
  // The last row (13:00 on D+1) marks the window end — no assignments will start there
  // Drop it so the last visible row is 12:00
  rows.pop()

  // For a given position and hour, find all soldiers assigned during [hourDate, hourDate+1h)
  const getCellSoldiers = (posId: number, hourDate: Date): string[] => {
    const hourMs = hourDate.getTime()
    const endMs = hourMs + 3600_000
    return assignments
      .filter(a =>
        a.position_id === posId &&
        new Date(a.slot_start).getTime() < endMs &&
        new Date(a.slot_end).getTime() > hourMs
      )
      .map(a => soldierMap.get(a.soldier_id) ?? `#${a.soldier_id}`)
  }

  const COLOR_HEADER: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-700',
    blue: 'bg-blue-100 text-blue-700',
    amber: 'bg-amber-100 text-amber-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    red: 'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-700',
  }
  const COLOR_CELL: Record<string, string> = {
    slate: 'bg-slate-50 text-slate-700',
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-700',
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/ops" className="text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800">תצוגת שיבוץ</h1>
          <p className="text-slate-500 text-sm mt-0.5">{formatDate(date)}</p>
        </div>
        {canEdit && (
          <Link
            href={`/ops/schedule?date=${date}`}
            className="flex items-center gap-1.5 text-sm text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            עריכה
          </Link>
        )}
      </div>

      {/* Date navigation */}
      <div className="bg-white rounded-xl border border-slate-100 p-3 flex items-center gap-2">
        <Link
          href={`/ops/schedule/view?date=${prevStr}`}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          title="יום קודם"
        >
          <ChevronRight className="w-5 h-5" />
        </Link>
        <form className="flex gap-2 flex-1 justify-center">
          <input
            type="date"
            name="date"
            defaultValue={date}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            טען
          </button>
        </form>
        <Link
          href={`/ops/schedule/view?date=${nextStr}`}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          title="יום הבא"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
      </div>

      {/* Status */}
      {scheduleDay && (
        <span className={`inline-flex text-xs px-2.5 py-1 rounded-full font-medium ${
          scheduleDay.status === 'published'
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-amber-100 text-amber-700'
        }`}>
          {scheduleDay.status === 'published' ? 'מפורסם' : 'טיוטה'}
        </span>
      )}

      {/* No schedule */}
      {!scheduleDay && (
        <div className="bg-white rounded-xl border border-slate-100 py-16 text-center text-slate-400">
          <p className="text-base">אין שיבוץ שמור לתאריך זה</p>
          {canEdit && (
            <Link
              href={`/ops/schedule?date=${date}`}
              className="text-blue-600 hover:underline text-sm mt-2 inline-block"
            >
              צור שיבוץ
            </Link>
          )}
        </div>
      )}

      {/* Timeline table */}
      {scheduleDay && positionsList.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="text-right px-3 py-2 text-xs font-semibold text-slate-400 w-14 sticky right-0 bg-white border-b border-l border-slate-200 z-10">
                  שעה
                </th>
                {positionsList.map((pos: any) => (
                  <th
                    key={pos.id}
                    className={`px-3 py-2 text-xs font-semibold text-center min-w-[110px] border-b border-slate-200 ${COLOR_HEADER[pos.color] ?? COLOR_HEADER.slate}`}
                  >
                    {pos.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ label, hourDate, isNextDay }, i) => {
                const isAlt = i % 2 !== 0
                return (
                  <tr key={label} className={isAlt ? 'bg-slate-50/50' : ''}>
                    <td
                      className={`px-3 py-1.5 text-xs font-mono sticky right-0 border-l border-slate-100 ${
                        isAlt ? 'bg-slate-50' : 'bg-white'
                      } ${isNextDay ? 'text-slate-400' : 'text-slate-600'}`}
                    >
                      {isNextDay && <span className="text-slate-300 ml-0.5 text-[10px]">+1</span>}
                      {label}
                    </td>
                    {positionsList.map((pos: any) => {
                      const names = getCellSoldiers(pos.id, hourDate)
                      return (
                        <td key={pos.id} className="px-1.5 py-1 text-center align-middle">
                          {names.length > 0 ? (
                            <div className="flex flex-col gap-0.5 items-center">
                              {names.map((name, idx) => (
                                <span
                                  key={idx}
                                  className={`text-xs px-1.5 py-0.5 rounded whitespace-nowrap ${COLOR_CELL[pos.color] ?? COLOR_CELL.slate}`}
                                >
                                  {name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-200 text-xs">—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
