import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import MelmForm from './melm-form'

interface Props { params: Promise<{ id: string }> }

export default async function MelmRequestPage({ params }: Props) {
  const { id } = await params
  const isNew = id === 'new'
  const supabase = await createClient()

  const [{ data: departments }, requestResult] = await Promise.all([
    supabase.from('departments').select('*').order('display_order'),
    isNew
      ? { data: null, error: null }
      : supabase
          .from('melm_requests')
          .select('*, department:departments(id,name)')
          .eq('id', parseInt(id))
          .single(),
  ])

  if (!isNew && requestResult.error) notFound()
  const request = requestResult.data

  let items: any[] = []
  if (!isNew && request) {
    const { data } = await supabase
      .from('melm_items')
      .select('*, type:equipment_types(id,name,unit)')
      .eq('request_id', request.id)
      .order('created_at')
    items = data ?? []
  }

  const { data: equipTypes } = await supabase.from('equipment_types').select('*').order('category').order('name')

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/melm" className="text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {isNew ? 'בקשת מל"מ חדשה' : (request?.title ?? `בקשה #${id}`)}
          </h1>
          {!isNew && request && (
            <p className="text-slate-500 text-sm">
              {(request.department as any)?.name ?? ''} · {formatDate(request.created_at)}
            </p>
          )}
        </div>
      </div>

      <MelmForm
        request={request}
        departments={departments ?? []}
        equipTypes={equipTypes ?? []}
        items={items}
        isNew={isNew}
      />
    </div>
  )
}
