import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/auth/server'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import NewEquipmentForm from './new-equipment-form'

export default async function NewEquipmentPage() {
  await requirePermission('equipment:admin')
  const supabase = await createClient()
  const { data: types } = await supabase.from('equipment_types').select('*').order('category').order('name')

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/equipment" className="text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">פריט ציוד חדש</h1>
      </div>
      <NewEquipmentForm types={types ?? []} />
    </div>
  )
}
