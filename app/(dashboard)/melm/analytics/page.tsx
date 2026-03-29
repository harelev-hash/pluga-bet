import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/auth/server'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import AnalyticsClient from './analytics-client'

export default async function MelmAnalyticsPage() {
  await requirePermission('melm:view')
  const supabase = await createClient()

  const [{ data: requests }, { data: items }] = await Promise.all([
    supabase
      .from('melm_requests')
      .select('id, status, department_id, request_date, created_at, department:departments(id, name)'),
    supabase
      .from('melm_items')
      .select('id, request_id, item_kind, quantity_requested, resap_status, free_text, type:equipment_types(id, name, category), soldier:soldiers(id, full_name, department_id, departments(name))'),
  ])

  return (
    <div className="max-w-4xl mx-auto space-y-5" dir="rtl">
      <div className="flex items-center gap-3">
        <Link href="/melm" className="text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ניתוח היסטוריית מל&quot;מ</h1>
          <p className="text-slate-500 text-sm mt-0.5">מגמות ונתונים מצטברים</p>
        </div>
      </div>

      <AnalyticsClient requests={requests ?? []} items={items ?? []} />
    </div>
  )
}
