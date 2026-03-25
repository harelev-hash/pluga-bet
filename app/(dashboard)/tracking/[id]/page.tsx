import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import TrackingForm from './tracking-form'
import TrackingEntries from './tracking-entries'

interface Props {
  params: Promise<{ id: string }>
}

export default async function TrackingPage({ params }: Props) {
  const { id } = await params
  const isNew = id === 'new'
  const supabase = await createClient()

  const [{ data: departments }, eventResult] = await Promise.all([
    supabase.from('departments').select('*').order('display_order'),
    isNew
      ? { data: null, error: null }
      : supabase
          .from('tracking_events')
          .select('*, department:departments(id,name)')
          .eq('id', parseInt(id))
          .single(),
  ])

  if (!isNew && eventResult.error) notFound()
  const event = eventResult.data

  let entries: any[] = []
  if (!isNew && event) {
    const { data } = await supabase
      .from('tracking_entries')
      .select('*, soldier:soldiers(id,full_name,rank)')
      .eq('event_id', event.id)
      .order('created_at', { ascending: false })
    entries = data ?? []
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/tracking" className="text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {isNew ? 'מעקב חדש' : event?.title}
          </h1>
          {!isNew && event && (
            <p className="text-slate-500 text-sm">{formatDate(event.event_date)}</p>
          )}
        </div>
      </div>

      <TrackingForm
        event={event}
        departments={departments ?? []}
        isNew={isNew}
      />

      {!isNew && event && (
        <TrackingEntries eventId={event.id} entries={entries} />
      )}
    </div>
  )
}
