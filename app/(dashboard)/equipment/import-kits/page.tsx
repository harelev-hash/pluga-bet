import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import ImportKitsForm from './import-kits-form'

export default async function ImportKitsPage() {
  const supabase = await createClient()

  const [{ data: soldiers }, { data: types }, { data: existingItems }] = await Promise.all([
    supabase.from('soldiers').select('id, full_name, id_number, rank').eq('is_active', true).order('full_name'),
    supabase.from('equipment_types').select('id, name, category, is_serialized, ownership'),
    supabase.from('equipment_items').select('id, type_id, serial_number'),
  ])

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/equipment" className="text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ייבוא תיקי לוחם</h1>
          <p className="text-slate-500 text-sm mt-0.5">ייבוא מאקסל — יוצר תיקים + שיוך מיועד לחיילים</p>
        </div>
      </div>

      <ImportKitsForm
        soldiers={soldiers ?? []}
        types={types ?? []}
        existingItems={existingItems ?? []}
      />
    </div>
  )
}
