import { createClient } from '@/lib/supabase/server'
import TrackingList from './tracking-list'

export default async function TrackingPage() {
  const supabase = await createClient()

  const [{ data: events }, { data: currentPeriod }, { data: soldiers }] = await Promise.all([
    supabase
      .from('tracking_events')
      .select('id, name, description, event_date, type, entries:tracking_entries(id, status)')
      .order('event_date', { ascending: false }),
    supabase.from('reserve_periods').select('id, name').eq('is_current', true).maybeSingle(),
    supabase.from('soldiers').select('id').eq('is_active', true),
  ])

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">מעקבים</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {currentPeriod ? `סבב: ${currentPeriod.name}` : 'אין סבב פעיל'}
          {' · '}{soldiers?.length ?? 0} חיילים פעילים
        </p>
      </div>

      <TrackingList
        events={(events ?? []) as any}
        currentPeriodId={currentPeriod?.id ?? null}
        activeSoldierIds={(soldiers ?? []).map(s => s.id)}
      />
    </div>
  )
}
