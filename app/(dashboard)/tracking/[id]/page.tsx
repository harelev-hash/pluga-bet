import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import TrackingView from './tracking-view'

interface Props {
  params: Promise<{ id: string }>
}

export default async function TrackingEventPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: event, error }, { data: entries }, { data: departments }] = await Promise.all([
    supabase
      .from('tracking_events')
      .select('id, name, description, event_date, period_id, type')
      .eq('id', parseInt(id))
      .single(),
    supabase
      .from('tracking_entries')
      .select('id, soldier_id, status, notes, marked_at, soldier:soldiers(id, full_name, rank, id_number, department_id)')
      .eq('event_id', parseInt(id))
      .order('soldier_id'),
    supabase.from('departments').select('id, name').order('display_order'),
  ])

  if (error || !event) notFound()

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/tracking" className="text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800">{event.name}</h1>
            {(event as any).type && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{(event as any).type}</span>
            )}
          </div>
          <p className="text-slate-500 text-sm mt-0.5">
            {formatDate(event.event_date)}
            {event.description && ` · ${event.description}`}
          </p>
        </div>
      </div>

      <TrackingView event={event} entries={(entries ?? []) as any} departments={departments ?? []} />
    </div>
  )
}
