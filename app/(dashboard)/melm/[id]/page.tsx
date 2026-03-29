import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import HandleClient from './handle-client'

interface Props { params: Promise<{ id: string }> }

export default async function MelmHandlePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: request, error } = await supabase
    .from('melm_requests')
    .select('*, department:departments(id, name)')
    .eq('id', parseInt(id))
    .single()

  if (error || !request) notFound()

  const { data: items } = await supabase
    .from('melm_items')
    .select(`
      id, item_kind, quantity_requested, notes, free_text,
      resap_status, resap_notes, assignment_id,
      soldier:soldiers(id, full_name, rank),
      type:equipment_types(id, name),
      assignment:equipment_assignments(id, condition_in, attribute, item:equipment_items(serial_number))
    `)
    .eq('request_id', parseInt(id))
    .order('id')

  // Fetch submitter name
  let submitterName: string | null = null
  if (request.submitted_by) {
    const { data: u } = await supabase
      .from('app_users')
      .select('full_name')
      .eq('id', request.submitted_by)
      .single()
    submitterName = u?.full_name ?? null
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5" dir="rtl">
      <div className="flex items-center gap-3">
        <Link href="/melm" className="text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {request.title ?? `בקשה #${id}`}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {(request.department as any)?.name ?? ''}
            {' · '}
            {formatDate(request.request_date ?? request.created_at)}
            {submitterName && <span> · הוגש ע"י {submitterName}</span>}
          </p>
        </div>
      </div>

      <HandleClient
        requestId={parseInt(id)}
        initialStatus={request.status}
        items={items ?? []}
      />
    </div>
  )
}
