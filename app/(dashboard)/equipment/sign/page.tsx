import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import SignForm from './sign-form'

export default async function SignEquipmentPage() {
  const supabase = await createClient()

  const [{ data: soldiers }, { data: types }, { data: items }, { data: templates }, { data: period }] = await Promise.all([
    supabase.from('soldiers').select('id, full_name, rank, role_in_unit, department_id').eq('is_active', true).order('full_name'),
    supabase.from('equipment_types').select('*').order('category').order('name'),
    supabase.from('equipment_items').select('*').eq('condition', 'serviceable'),
    supabase.from('equipment_templates').select('*, items:equipment_template_items(*, type:equipment_types(*))').eq('is_active', true).order('name'),
    supabase.from('reserve_periods').select('*').eq('is_current', true).maybeSingle(),
  ])

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/equipment" className="text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">חתמת ציוד</h1>
          <p className="text-slate-500 text-sm mt-0.5">שיוך ציוד לחייל</p>
        </div>
      </div>

      <SignForm
        soldiers={soldiers ?? []}
        types={types ?? []}
        items={items ?? []}
        templates={templates ?? []}
        currentPeriodId={period?.id ?? null}
      />
    </div>
  )
}
