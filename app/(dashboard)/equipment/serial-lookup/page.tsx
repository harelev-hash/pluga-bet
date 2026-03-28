import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import SerialLookupClient from './serial-lookup-client'

export default async function SerialLookupPage() {
  const supabase = await createClient()

  // Fetch all serialized items with their active/planned assignment (if any)
  const { data: items } = await supabase
    .from('equipment_items')
    .select(`
      id, serial_number, condition,
      type:equipment_types(id, name, category),
      assignment:equipment_assignments(
        status, attribute,
        soldier:soldiers(full_name, rank)
      )
    `)
    .order('serial_number')

  // Flatten: each item may have multiple assignments (history), pick active/planned one
  const processed = (items ?? []).map((item: any) => {
    const assignments: any[] = Array.isArray(item.assignment) ? item.assignment : item.assignment ? [item.assignment] : []
    const current = assignments.find((a: any) => a.status === 'active' || a.status === 'planned') ?? null
    return { ...item, assignment: current }
  })

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/equipment" className="text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">מציאת פריט לפי צ&apos;</h1>
          <p className="text-slate-500 text-sm mt-0.5">חיפוש פריטים לפי מספר סידורי</p>
        </div>
      </div>

      <SerialLookupClient items={processed} />
    </div>
  )
}
