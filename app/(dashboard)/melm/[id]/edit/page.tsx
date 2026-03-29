import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/auth/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import RequestForm from '../../request/request-form'

interface Props { params: Promise<{ id: string }> }

export default async function MelmEditPage({ params }: Props) {
  const { id } = await params
  await requirePermission('melm:create')
  const supabase = await createClient()

  const [{ data: request, error }, { data: departments }, { data: soldiers }, { data: equipTypes }, { data: assignments }] =
    await Promise.all([
      supabase.from('melm_requests').select('id, title, department_id, request_date').eq('id', parseInt(id)).single(),
      supabase.from('departments').select('id, name').order('display_order'),
      supabase.from('soldiers').select('id, full_name, rank, department_id').eq('is_active', true).order('full_name'),
      supabase.from('equipment_types').select('id, name, category').order('category').order('name'),
      supabase.from('equipment_assignments')
        .select('id, soldier_id, condition_in, attribute, item:equipment_items(serial_number), type:equipment_types(id, name)')
        .in('status', ['active', 'planned']),
    ])

  if (error || !request) notFound()

  const { data: items } = await supabase
    .from('melm_items')
    .select('id, item_kind, soldier_id, assignment_id, type_id, free_text, quantity_requested, notes')
    .eq('request_id', parseInt(id))
    .order('id')

  const initialData = {
    id: request.id,
    title: request.title,
    department_id: request.department_id,
    request_date: request.request_date,
    items: items ?? [],
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5" dir="rtl">
      <div className="flex items-center gap-3">
        <Link href="/melm" className="text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">עריכת בקשה #{id}</h1>
          <p className="text-slate-500 text-sm mt-0.5">ערוך את פרטי הבקשה והסעיפים</p>
        </div>
      </div>

      <RequestForm
        departments={departments ?? []}
        soldiers={soldiers ?? []}
        equipTypes={equipTypes ?? []}
        assignments={assignments ?? []}
        initialData={initialData}
      />
    </div>
  )
}
