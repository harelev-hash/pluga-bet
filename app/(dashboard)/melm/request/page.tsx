import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/auth/server'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import RequestForm from './request-form'

export default async function MelmRequestPage() {
  await requirePermission('melm:create')
  const supabase = await createClient()

  const [
    { data: departments },
    { data: soldiers },
    { data: equipTypes },
    { data: assignments },
  ] = await Promise.all([
    supabase.from('departments').select('id, name').order('display_order'),
    supabase
      .from('soldiers')
      .select('id, full_name, rank, department_id')
      .eq('is_active', true)
      .order('full_name'),
    supabase
      .from('equipment_types')
      .select('id, name, category')
      .order('category')
      .order('name'),
    supabase
      .from('equipment_assignments')
      .select('id, soldier_id, condition_in, attribute, item:equipment_items(serial_number), type:equipment_types(id, name)')
      .in('status', ['active', 'planned']),
  ])

  return (
    <div className="max-w-3xl mx-auto space-y-5" dir="rtl">
      <div className="flex items-center gap-3">
        <Link href="/melm" className="text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">בקשת מל&quot;מ</h1>
          <p className="text-slate-500 text-sm mt-0.5">הגש בקשה עבור המחלקה שלך</p>
        </div>
      </div>

      <RequestForm
        departments={departments ?? []}
        soldiers={soldiers ?? []}
        equipTypes={equipTypes ?? []}
        assignments={assignments ?? []}
      />
    </div>
  )
}
