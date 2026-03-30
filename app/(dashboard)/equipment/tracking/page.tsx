import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/auth/server'
import Link from 'next/link'
import { ArrowRight, History } from 'lucide-react'
import TrackingClient from './tracking-client'

export const dynamic = 'force-dynamic'

export default async function EquipmentTrackingPage() {
  await requirePermission('equipment:green_eyes')
  const supabase = await createClient()

  const [{ data: templates }, { data: assignments }, { data: storageLocations }, { data: soldiers }] = await Promise.all([
    supabase
      .from('equipment_templates')
      .select('id, name, items:equipment_template_items(type_id)')
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('equipment_assignments')
      .select(`
        id, attribute, quantity,
        storage_location_id, storage_soldier_id,
        storage_location:storage_locations(id, name),
        storage_soldier:soldiers!storage_soldier_id(id, full_name),
        soldier:soldiers!soldier_id(id, full_name),
        item:equipment_items(id, serial_number, type:equipment_types(id, name, category)),
        type:equipment_types(id, name, category)
      `)
      .eq('status', 'active')
      .order('id'),
    supabase.from('storage_locations').select('id, name').eq('is_active', true).order('sort_order'),
    supabase.from('soldiers').select('id, full_name').eq('is_active', true).order('full_name'),
  ])

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/equipment" className="text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800">מעקב ציוד יומי</h1>
          <p className="text-slate-500 text-sm mt-0.5">בדיקת פריטים לפי סוג ציוד</p>
        </div>
        <Link
          href="/equipment/tracking/history"
          className="flex items-center gap-1.5 px-3 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg text-sm transition-colors"
        >
          <History className="w-4 h-4" />
          דוחות קודמים
        </Link>
      </div>

      <TrackingClient
        templates={(templates ?? []) as any}
        assignments={(assignments ?? []) as any}
        storageLocations={storageLocations ?? []}
        soldiers={soldiers ?? []}
      />
    </div>
  )
}
