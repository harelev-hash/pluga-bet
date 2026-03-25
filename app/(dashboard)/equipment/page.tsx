import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Package, Plus } from 'lucide-react'

const CONDITION_COLORS: Record<string, string> = {
  serviceable: 'bg-green-100 text-green-700',
  needs_repair: 'bg-yellow-100 text-yellow-700',
  unserviceable: 'bg-red-100 text-red-700',
}
const CONDITION_LABELS: Record<string, string> = {
  serviceable: 'תקין',
  needs_repair: 'טעון תיקון',
  unserviceable: 'לא תקין',
}

export default async function EquipmentPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>
}) {
  const { category, q } = await searchParams
  const supabase = await createClient()

  const [{ data: types }, { data: items }] = await Promise.all([
    supabase.from('equipment_types').select('*').order('category').order('name'),
    (() => {
      let query = supabase
        .from('equipment_items')
        .select('*, type:equipment_types(id,name,category,is_serialized,unit)')
        .order('created_at', { ascending: false })
      if (category) query = query.eq('equipment_types.category', category)
      return query
    })(),
  ])

  // Group by category
  const categories = [...new Set(types?.map(t => t.category) ?? [])]

  // Quantity-type equipment (sum by type)
  const quantityTypes = types?.filter(t => !t.is_serialized) ?? []
  const serializedItems = items?.filter((i: any) => i.type?.is_serialized) ?? []

  // For quantity types, count items by type_id
  const quantityByType: Record<number, number> = {}
  items?.forEach((i: any) => {
    if (!i.type?.is_serialized) {
      quantityByType[i.type_id] = (quantityByType[i.type_id] ?? 0) + (i.quantity ?? 1)
    }
  })

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ציוד</h1>
          <p className="text-slate-500 text-sm mt-0.5">{items?.length ?? 0} פריטים</p>
        </div>
        <Link
          href="/equipment/new"
          className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          פריט חדש
        </Link>
      </div>

      {/* Category filter */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
        <form className="flex flex-wrap gap-2">
          <Link
            href="/equipment"
            className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${!category ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
          >
            הכל
          </Link>
          {categories.map(cat => (
            <Link
              key={cat}
              href={`/equipment?category=${cat}`}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${category === cat ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
            >
              {cat}
            </Link>
          ))}
        </form>
      </div>

      {/* Serialized items */}
      {serializedItems.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-700">ציוד עם מספר סידורי</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">סוג</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">מ"ס</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">מצב</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">מיקום</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">הערות</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {serializedItems.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800 text-sm">{item.type?.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-500 font-mono">{item.serial_number ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${CONDITION_COLORS[item.condition] ?? ''}`}>
                        {CONDITION_LABELS[item.condition] ?? item.condition}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">{item.location ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-400 max-w-xs truncate">{item.notes ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Link href={`/equipment/${item.id}`} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        פרטים
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quantity types */}
      {quantityTypes.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-700">ציוד כמותי</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {quantityTypes.map((type: any) => (
              <div key={type.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <span className="font-medium text-slate-800 text-sm">{type.name}</span>
                  <span className="text-xs text-slate-400 mr-2">{type.category}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-blue-700">{quantityByType[type.id] ?? 0}</span>
                  <span className="text-xs text-slate-400">{type.unit ?? 'יח\''}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(!items || items.length === 0) && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 py-16 text-center">
          <Package className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400">אין פריטי ציוד</p>
        </div>
      )}
    </div>
  )
}
