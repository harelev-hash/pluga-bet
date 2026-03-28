import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import GreenEyesClient from './green-eyes-client'

export default async function GreenEyesPage() {
  const supabase = await createClient()

  const [{ data: departments }, { data: templates }, { data: soldiers }, { data: assignments }] = await Promise.all([
    supabase.from('departments').select('id, name, display_order').order('display_order'),
    supabase
      .from('equipment_templates')
      .select('id, name, items:equipment_template_items(type_id)')
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('soldiers')
      .select('id, full_name, rank, role_in_unit, department_id')
      .eq('is_active', true)
      .order('full_name'),
    supabase
      .from('equipment_assignments')
      .select(`
        id, status, attribute, quantity,
        soldier:soldiers(id),
        item:equipment_items(id, serial_number, type:equipment_types(id, name, category)),
        type:equipment_types(id, name, category)
      `)
      .in('status', ['active', 'planned'])
      .order('id'),
  ])

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/equipment" className="text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ירוק בעיניים</h1>
          <p className="text-slate-500 text-sm mt-0.5">בדיקת ציוד יומית לפי מחלקה</p>
        </div>
      </div>

      <GreenEyesClient
        departments={departments ?? []}
        templates={(templates ?? []) as any}
        soldiers={soldiers ?? []}
        assignments={(assignments ?? []) as any}
      />
    </div>
  )
}
