import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Package, PenLine, LayoutList, Settings, FileSpreadsheet, UserCheck, BarChart2, ScanSearch, Eye } from 'lucide-react'

function ConditionBadge({ condition }: { condition: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    serviceable: { label: 'תקין', cls: 'bg-green-100 text-green-700' },
    worn:        { label: 'בלאי', cls: 'bg-yellow-100 text-yellow-700' },
    damaged:     { label: 'פגום', cls: 'bg-red-100 text-red-700' },
  }
  const c = map[condition] ?? { label: condition, cls: 'bg-slate-100 text-slate-500' }
  return <span className={`text-xs px-2 py-0.5 rounded-full ${c.cls}`}>{c.label}</span>
}

export default async function EquipmentPage() {
  const supabase = await createClient()

  const [{ data: assignments }, { data: types }] = await Promise.all([
    supabase
      .from('equipment_assignments')
      .select('id, condition_in, attribute, quantity, signed_at, soldier:soldiers(id, full_name, rank), type:equipment_types(name), item:equipment_items(serial_number, type:equipment_types(name))')
      .eq('status', 'active')
      .order('signed_at', { ascending: false })
      .limit(20),
    supabase.from('equipment_types').select('id'),
  ])

  const totalAssigned = assignments?.length ?? 0
  const wornCount = assignments?.filter((a: any) => a.condition_in === 'worn' || a.condition_in === 'damaged').length ?? 0

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">ציוד</h1>
        <p className="text-slate-500 text-sm mt-0.5">ניהול ציוד וחתמות</p>
      </div>

      {/* פעולות */}
      <div>
        <p className="text-xs font-semibold text-slate-400 mb-2 px-0.5">פעולות</p>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/equipment/reception" className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl p-4 flex flex-col gap-2 transition-colors shadow-sm">
            <UserCheck className="w-5 h-5" />
            <span className="font-semibold text-sm">קליטת חיילים</span>
            <span className="text-xs text-teal-100">אישור מיועד → חתום</span>
          </Link>
          <Link href="/equipment/sign" className="bg-green-600 hover:bg-green-700 text-white rounded-xl p-4 flex flex-col gap-2 transition-colors shadow-sm">
            <PenLine className="w-5 h-5" />
            <span className="font-semibold text-sm">החתמת ציוד ידנית</span>
            <span className="text-xs text-green-100">שיוך ציוד לחייל</span>
          </Link>
        </div>
      </div>

      {/* דוחות */}
      <div>
        <p className="text-xs font-semibold text-slate-400 mb-2 px-0.5">דוחות</p>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/equipment/inventory" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl p-4 flex flex-col gap-2 transition-colors shadow-sm">
            <LayoutList className="w-5 h-5" />
            <span className="font-semibold text-sm">מלאי</span>
            <span className="text-xs text-blue-100">פנוי / מיועד / חתום</span>
          </Link>
          <Link href="/equipment/report" className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl p-4 flex flex-col gap-2 transition-colors shadow-sm">
            <BarChart2 className="w-5 h-5" />
            <span className="font-semibold text-sm">דוח לפי חייל</span>
            <span className="text-xs text-violet-100">מה יש לכל חייל</span>
          </Link>
          <Link href="/equipment/serial-lookup" className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl p-4 flex flex-col gap-2 transition-colors shadow-sm">
            <ScanSearch className="w-5 h-5" />
            <span className="font-semibold text-sm">מציאת פריט לפי צ&apos;</span>
            <span className="text-xs text-cyan-100">חיפוש לפי מ״ס</span>
          </Link>
          <Link href="/equipment/green-eyes" className="bg-green-600 hover:bg-green-700 text-white rounded-xl p-4 flex flex-col gap-2 transition-colors shadow-sm">
            <Eye className="w-5 h-5" />
            <span className="font-semibold text-sm">ירוק בעיניים</span>
            <span className="text-xs text-green-100">בדיקת ציוד יומית</span>
          </Link>
        </div>
      </div>

      {/* ניהול */}
      <div>
        <p className="text-xs font-semibold text-slate-400 mb-2 px-0.5">ניהול</p>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/equipment/admin" className="bg-slate-700 hover:bg-slate-800 text-white rounded-xl p-4 flex flex-col gap-2 transition-colors shadow-sm">
            <Settings className="w-5 h-5" />
            <span className="font-semibold text-sm">ניהול הגדרות ציוד</span>
            <span className="text-xs text-slate-300">מקומות אפסון, סוגי ציוד, תבניות אפיון</span>
          </Link>
          <Link href="/equipment/import-kits" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl p-4 flex flex-col gap-2 transition-colors shadow-sm">
            <FileSpreadsheet className="w-5 h-5" />
            <span className="font-semibold text-sm">ייבוא מקובץ אקסל</span>
            <span className="text-xs text-indigo-100">ייבוא תיקי לוחם</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{totalAssigned}</p>
          <p className="text-xs text-slate-500 mt-1">חתמות פעילות</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 text-center">
          <p className="text-2xl font-bold text-slate-800">{types?.length ?? 0}</p>
          <p className="text-xs text-slate-500 mt-1">סוגי ציוד</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 text-center">
          <p className={`text-2xl font-bold ${wornCount > 0 ? 'text-amber-500' : 'text-green-600'}`}>{wornCount}</p>
          <p className="text-xs text-slate-500 mt-1">פריטים בבלאי/פגומים</p>
        </div>
      </div>

      {assignments && assignments.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-700">חתמות אחרונות</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-right font-semibold text-slate-500">חייל</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-500">פריט</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-500">פרטים</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-500">מצב</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-500">תאריך</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(assignments as any[]).map((a) => {
                const itemName = a.item
                  ? `${a.item.type?.name ?? ''}${a.item.serial_number ? ` #${a.item.serial_number}` : ''}`
                  : a.type?.name ?? '—'
                return (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {a.soldier?.full_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{itemName}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {a.attribute && <span className="bg-slate-100 px-1.5 py-0.5 rounded mr-1">{a.attribute}</span>}
                      {!a.item && a.quantity > 1 && <span className="text-slate-400">x{a.quantity}</span>}
                    </td>
                    <td className="px-4 py-3"><ConditionBadge condition={a.condition_in} /></td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {new Date(a.signed_at).toLocaleDateString('he-IL')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 py-16 text-center">
          <Package className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">אין חתמות פעילות</p>
          <Link href="/equipment/sign" className="mt-3 inline-block text-blue-600 text-sm hover:underline">
            התחל חתמת ציוד ←
          </Link>
        </div>
      )}
    </div>
  )
}
