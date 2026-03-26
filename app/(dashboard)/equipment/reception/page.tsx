import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import ReceptionClient from './reception-client'

export default async function ReceptionPage() {
  const supabase = await createClient()

  // Get all soldiers with planned assignments
  const { data: planned } = await supabase
    .from('equipment_assignments')
    .select(`
      id, quantity, attribute, condition_in, notes,
      item_id, type_id,
      soldier:soldiers(id, full_name, rank, role_in_unit, department_id),
      item:equipment_items(id, serial_number, type:equipment_types(id, name)),
      type:equipment_types(id, name)
    `)
    .eq('status', 'planned')
    .order('soldier_id')

  // Get soldiers who are already fully received (have active assignments this period)
  const { data: active } = await supabase
    .from('equipment_assignments')
    .select('soldier_id')
    .eq('status', 'active')

  const { data: currentPeriod } = await supabase
    .from('reserve_periods')
    .select('id, name')
    .eq('is_current', true)
    .maybeSingle()

  const activeSoldierIds = new Set(active?.map(a => a.soldier_id) ?? [])

  // Group planned by soldier
  type PlannedRow = NonNullable<typeof planned>[number]
  const bySoldier = new Map<number, { soldier: PlannedRow['soldier']; items: PlannedRow[] }>()
  for (const row of planned ?? []) {
    const s = row.soldier as { id: number; full_name: string; rank: string; role_in_unit: string | null; department_id: number | null }
    if (!s) continue
    if (!bySoldier.has(s.id)) bySoldier.set(s.id, { soldier: s, items: [] })
    bySoldier.get(s.id)!.items.push(row)
  }

  const soldierGroups = Array.from(bySoldier.values()).sort((a, b) => {
    const aReceived = activeSoldierIds.has((a.soldier as any).id)
    const bReceived = activeSoldierIds.has((b.soldier as any).id)
    if (aReceived && !bReceived) return 1
    if (!aReceived && bReceived) return -1
    return (a.soldier as any).full_name.localeCompare((b.soldier as any).full_name, 'he')
  })

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/equipment" className="text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">קליטת חיילים</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {currentPeriod ? `סבב: ${currentPeriod.name}` : 'אין סבב פעיל'}
            {' · '}
            {soldierGroups.length} חיילים עם ציוד מיועד
          </p>
        </div>
      </div>

      <ReceptionClient
        soldierGroups={soldierGroups as any}
        activeSoldierIds={[...activeSoldierIds]}
        currentPeriodId={currentPeriod?.id ?? null}
      />
    </div>
  )
}
