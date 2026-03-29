import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/auth/server'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import DutyTypesClient from './duty-types-client'

export default async function DutyTypesPage() {
  await requirePermission('ops:manage')
  const supabase = await createClient()

  const [{ data: positions }, { data: timeRules }] = await Promise.all([
    supabase.from('duty_positions').select('*').order('display_order').order('name'),
    supabase.from('position_time_rules').select('*').order('position_id').order('from_hour'),
  ])

  return (
    <div className="max-w-4xl mx-auto space-y-5" dir="rtl">
      <div className="flex items-center gap-3">
        <Link href="/ops" className="text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ניהול עמדות</h1>
          <p className="text-slate-500 text-sm mt-0.5">הגדרת עמדות, משמרות וכוננויות</p>
        </div>
      </div>

      <DutyTypesClient
        positions={positions ?? []}
        timeRules={timeRules ?? []}
      />
    </div>
  )
}
