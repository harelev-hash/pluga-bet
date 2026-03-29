import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/auth/server'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import SoldiersImport from './soldiers-import'

export default async function ImportPage() {
  await requirePermission('soldiers:edit')
  const supabase = await createClient()
  const { data: departments } = await supabase.from('departments').select('*').order('display_order')

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/soldiers" className="text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ייבוא חיילים מאקסל</h1>
          <p className="text-slate-500 text-sm mt-0.5">העלה קובץ Excel עם פרטי החיילים</p>
        </div>
      </div>
      <SoldiersImport departments={departments ?? []} />
    </div>
  )
}
