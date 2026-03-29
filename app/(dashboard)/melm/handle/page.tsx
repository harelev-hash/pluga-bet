import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import HandleDashboard from './handle-dashboard'

export default async function MelmHandleDashboardPage() {
  const supabase = await createClient()

  const [{ data: requests }, { data: departments }] = await Promise.all([
    supabase
      .from('melm_requests')
      .select(`
        id, title, status, created_at, request_date,
        department:departments(id, name),
        items:melm_items(
          id, item_kind, quantity_requested, notes, free_text,
          resap_status, resap_notes,
          soldier:soldiers(full_name),
          type:equipment_types(name)
        )
      `)
      .order('created_at', { ascending: false }),
    supabase.from('departments').select('id, name').order('display_order'),
  ])

  return (
    <div className="max-w-4xl mx-auto space-y-5" dir="rtl">
      <div className="flex items-center gap-3">
        <Link href="/melm" className="text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">טיפול במל&quot;מ</h1>
          <p className="text-slate-500 text-sm mt-0.5">סקירה ופתיחת בקשות לטיפול</p>
        </div>
      </div>

      <HandleDashboard
        requests={requests ?? []}
        departments={departments ?? []}
      />
    </div>
  )
}
