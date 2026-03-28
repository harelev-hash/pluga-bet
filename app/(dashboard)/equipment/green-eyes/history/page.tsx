import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import GreenEyesHistory from './history-client'

export default async function GreenEyesHistoryPage() {
  const supabase = await createClient()

  const [{ data: reports }, { data: departments }] = await Promise.all([
    supabase
      .from('green_eyes_reports')
      .select(`
        id, report_date, created_at,
        department:departments(id, name),
        template:equipment_templates(id, name),
        performer:app_users(full_name),
        checks:green_eyes_checks(
          id, is_present, soldier_id,
          soldier:soldiers(full_name, role_in_unit),
          assignment:equipment_assignments(
            id, attribute,
            item:equipment_items(serial_number, type:equipment_types(name)),
            type:equipment_types(name)
          )
        )
      `)
      .order('report_date', { ascending: false }),
    supabase.from('departments').select('id, name').order('display_order'),
  ])

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/equipment/green-eyes" className="text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">היסטוריית ירוק בעיניים</h1>
          <p className="text-slate-500 text-sm mt-0.5">דוחות בדיקה קודמים</p>
        </div>
      </div>

      <GreenEyesHistory
        reports={(reports ?? []) as any}
        departments={departments ?? []}
      />
    </div>
  )
}
