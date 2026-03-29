import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import SerialLookupClient from './serial-lookup-client'

export default async function SerialLookupPage() {
  const supabase = await createClient()

  // Fetch all serialized items with ALL assignments (current + history)
  const { data: items } = await supabase
    .from('equipment_items')
    .select(`
      id, serial_number, condition,
      type:equipment_types(id, name, category),
      assignments:equipment_assignments(
        id, status, attribute, signed_at, returned_at, notes,
        soldier:soldiers(full_name, rank)
      )
    `)
    .order('serial_number')

  const processed = (items ?? []).map((item: any) => {
    const assignments: any[] = Array.isArray(item.assignments) ? item.assignments : []
    const current = assignments.find((a: any) => a.status === 'active' || a.status === 'planned') ?? null
    const history = assignments
      .filter((a: any) => a.status !== 'active' && a.status !== 'planned')
      .sort((a: any, b: any) => (b.returned_at ?? b.signed_at ?? '').localeCompare(a.returned_at ?? a.signed_at ?? ''))
    return { ...item, assignment: current, history }
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
