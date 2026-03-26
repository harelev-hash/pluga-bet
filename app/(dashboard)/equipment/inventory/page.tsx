import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowRight, ChevronDown } from 'lucide-react'
import InventoryTable from './inventory-table'

export default async function InventoryPage() {
  const supabase = await createClient()

  const [{ data: types }, { data: items }, { data: assignments }] = await Promise.all([
    supabase.from('equipment_types').select('*').order('category').order('name'),
    supabase.from('equipment_items').select('*'),
    supabase
      .from('equipment_assignments')
      .select('*, soldier:soldiers(id, full_name, rank, department_id)')
      .in('status', ['active', 'planned']),
  ])

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/equipment" className="text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">מלאי ציוד (רשמצ)</h1>
          <p className="text-slate-500 text-sm mt-0.5">מעקב על כל הציוד — פנוי / מיועד / חתום</p>
        </div>
      </div>

      <InventoryTable types={types ?? []} items={items ?? []} assignments={assignments ?? []} />
    </div>
  )
}
