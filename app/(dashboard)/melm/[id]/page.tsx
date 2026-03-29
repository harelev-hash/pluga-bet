import { createClient } from '@/lib/supabase/server'
import { getPermissions } from '@/lib/auth/server'
import { hasPermission } from '@/lib/permissions'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import HandleClient from './handle-client'

interface Props { params: Promise<{ id: string }> }

export default async function MelmHandlePage({ params }: Props) {
  const { id } = await params
  const permissions = await getPermissions()
  if (!hasPermission(permissions, 'melm:view')) redirect('/')
  const canHandle = hasPermission(permissions, 'melm:handle')
  const canClose  = hasPermission(permissions, 'melm:close')
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
      resap_status, resap_notes, resap_performed_by, resap_performed_at, assignment_id,
      soldier:soldiers(id, full_name, rank),
      type:equipment_types(id, name),
      assignment:equipment_assignments(id, condition_in, attribute, item:equipment_items(serial_number))
    `)
    .eq('request_id', parseInt(id))
    .order('id')

  // Collect all user UUIDs that need name lookup (submitter, item performers, closer)
  const uuidsToLookup = [
    request.submitted_by,
    request.closed_by,
    ...((items ?? []).map((i: any) => i.resap_performed_by)),
  ].filter(Boolean) as string[]

  const uniqueUuids = [...new Set(uuidsToLookup)]
  let userNameMap: Record<string, string> = {}
  if (uniqueUuids.length > 0) {
    const { data: users } = await supabase
      .from('app_users')
      .select('id, full_name')
      .in('id', uniqueUuids)
    ;(users ?? []).forEach((u: any) => { userNameMap[u.id] = u.full_name })
  }

  const submitterName = request.submitted_by ? (userNameMap[request.submitted_by] ?? null) : null
  const closedByName  = request.closed_by    ? (userNameMap[request.closed_by]    ?? null) : null

  const itemsWithPerformer = (items ?? []).map((i: any) => ({
    ...i,
    performerName: i.resap_performed_by ? (userNameMap[i.resap_performed_by] ?? null) : null,
  }))

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
            {submitterName && <span> · הוגש ע&quot;י {submitterName}</span>}
          </p>
          {request.closed_at && (
            <p className="text-xs text-slate-400 mt-0.5">
              נסגר {formatDate(request.closed_at)}
              {closedByName && <> ע&quot;י {closedByName}</>}
            </p>
          )}
        </div>
      </div>

      <HandleClient
        requestId={parseInt(id)}
        initialStatus={request.status}
        items={itemsWithPerformer}
        closedByName={closedByName}
        closedAt={request.closed_at ?? null}
        canHandle={canHandle}
        canClose={canClose}
      />
    </div>
  )
}
