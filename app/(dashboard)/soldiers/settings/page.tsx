import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/auth/server'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import CertTypesManager from './cert-types-manager'
import QualTypesManager from './qual-types-manager'

export const dynamic = 'force-dynamic'

export default async function SoldiersSettingsPage() {
  await requirePermission('soldiers:edit')
  const supabase = await createClient()

  const [{ data: certTypes }, { data: positions }, { data: qualTypes }] = await Promise.all([
    supabase.from('certification_types').select('*').order('display_order').order('name'),
    supabase.from('duty_positions').select('id, name').eq('is_active', true).order('display_order').order('name'),
    supabase.from('qualification_types').select('*').order('display_order').order('name'),
  ])

  return (
    <div className="max-w-2xl mx-auto space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/soldiers" className="text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">הגדרות כוח אדם</h1>
          <p className="text-slate-500 text-sm mt-0.5">ניהול רשימות תפקידים והסמכות</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <h2 className="font-semibold text-slate-700 mb-1">תפקיד בסבב</h2>
        <p className="text-slate-500 text-sm mb-4">
          ניהול רשימת התפקידים בסבב הזמינים בטפסי החיילים.
          ניתן לקשר כל תפקיד לעמדת שיבוץ.
          שינוי שם תפקיד יעדכן אוטומטית את כל החיילים.
        </p>
        <CertTypesManager initial={certTypes ?? []} positions={positions ?? []} />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <h2 className="font-semibold text-slate-700 mb-1">הסמכות</h2>
        <p className="text-slate-500 text-sm mb-4">
          ניהול רשימת ההסמכות הצבאיות הקבועות (כגון: צלף, חובש, מ"כ).
          שינוי שם הסמכה יעדכן אוטומטית את כל החיילים.
        </p>
        <QualTypesManager initial={qualTypes ?? []} />
      </div>
    </div>
  )
}
