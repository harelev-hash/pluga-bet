import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/auth/server'
import TypesAdmin from './types-admin'
import TemplatesAdmin from './templates-admin'
import StorageLocationsAdmin from './storage-locations-admin'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default async function EquipmentAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  await requirePermission('equipment:admin')
  const { tab = 'types' } = await searchParams
  const supabase = await createClient()

  const [{ data: types }, { data: templates }, { data: storageLocations }] = await Promise.all([
    supabase.from('equipment_types').select('*').order('category').order('name'),
    supabase
      .from('equipment_templates')
      .select('*, items:equipment_template_items(*, type:equipment_types(*))')
      .order('name'),
    supabase.from('storage_locations').select('*').order('sort_order'),
  ])

  const tabs = [
    { key: 'types',     label: 'סוגי ציוד' },
    { key: 'templates', label: 'תבניות אפיון' },
    { key: 'locations', label: 'מקומות אפסון' },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/equipment" className="text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ניהול ציוד</h1>
          <p className="text-slate-500 text-sm mt-0.5">סוגי ציוד ותבניות חתימה</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <Link
            key={t.key}
            href={`/equipment/admin?tab=${t.key}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === 'types' && <TypesAdmin types={types ?? []} />}
      {tab === 'templates' && <TemplatesAdmin templates={templates ?? []} types={types ?? []} />}
      {tab === 'locations' && <StorageLocationsAdmin locations={storageLocations ?? []} />}
    </div>
  )
}
