'use client'

import { useState } from 'react'
import type { EquipmentType, EquipmentItem, EquipmentAssignment } from '@/lib/types/database'
import { ChevronDown, ChevronUp, MapPin, Users } from 'lucide-react'

const OWNERSHIP_LABELS: Record<string, string> = {
  personal: 'אישי', platoon: 'פלוגתי', battalion: 'גדודי',
}
const OWNERSHIP_COLORS: Record<string, string> = {
  personal: 'bg-purple-100 text-purple-700',
  platoon:  'bg-blue-100 text-blue-700',
  battalion:'bg-amber-100 text-amber-700',
}

interface Props {
  types: EquipmentType[]
  items: EquipmentItem[]
  assignments: (EquipmentAssignment & { soldier?: { id: number; full_name: string; rank: string; department_id: number | null } | null })[]
}

export default function InventoryTable({ types, items, assignments }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [filterOwnership, setFilterOwnership] = useState<string>('')

  // For each type: calculate total inventory and how many are assigned
  const stats = types.map(type => {
    if (type.is_serialized) {
      const typeItems = items.filter(i => i.type_id === type.id)
      const assignedItemIds = new Set(
        assignments.filter(a => a.item_id != null).map(a => a.item_id!)
      )
      const total = typeItems.length
      const assigned = typeItems.filter(i => assignedItemIds.has(i.id)).length
      const assignedDetails = assignments
        .filter(a => a.item_id != null && typeItems.some(i => i.id === a.item_id))
        .map(a => ({
          serial: typeItems.find(i => i.id === a.item_id)?.serial_number ?? String(a.item_id),
          soldierName: a.soldier?.full_name ?? '—',
          soldierRank: a.soldier?.rank ?? '',
          condition: a.condition_in,
          attribute: a.attribute,
          location: typeItems.find(i => i.id === a.item_id)?.location,
        }))
      const freeLocations = typeItems
        .filter(i => !assignedItemIds.has(i.id))
        .map(i => i.location)
        .filter(Boolean) as string[]
      return { type, total, assigned, free: total - assigned, assignedDetails, freeLocations, isSerialized: true }
    } else {
      // Quantitative: sum items in inventory + sum assignments
      const inventoryQty = items.filter(i => i.type_id === type.id).reduce((s, i) => s + (i.quantity ?? 0), 0)
      const assignedQty = assignments.filter(a => a.type_id === type.id).reduce((s, a) => s + a.quantity, 0)
      const total = inventoryQty + assignedQty
      const assignedDetails = assignments
        .filter(a => a.type_id === type.id)
        .map(a => ({
          serial: null,
          soldierName: a.soldier?.full_name ?? '—',
          soldierRank: a.soldier?.rank ?? '',
          condition: a.condition_in,
          attribute: a.attribute,
          quantity: a.quantity,
          location: null,
        }))
      const freeLocations = items
        .filter(i => i.type_id === type.id && i.location)
        .map(i => i.location!)
      return { type, total, assigned: assignedQty, free: inventoryQty, assignedDetails, freeLocations, isSerialized: false }
    }
  })

  const filtered = stats.filter(s => {
    if (search && !s.type.name.includes(search) && !s.type.category.includes(search)) return false
    if (filterOwnership && s.type.ownership !== filterOwnership) return false
    return true
  })

  const categories = [...new Set(types.map(t => t.category))]

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="חיפוש פריט..."
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-40 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <select
          value={filterOwnership}
          onChange={e => setFilterOwnership(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">כל הבעלויות</option>
          <option value="personal">אישי</option>
          <option value="platoon">פלוגתי</option>
          <option value="battalion">גדודי</option>
        </select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 text-center">
          <p className="text-2xl font-bold text-slate-800">{filtered.reduce((s, r) => s + r.total, 0)}</p>
          <p className="text-xs text-slate-500 mt-1">סה"כ פריטים</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{filtered.reduce((s, r) => s + r.assigned, 0)}</p>
          <p className="text-xs text-slate-500 mt-1">חתומים</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{filtered.reduce((s, r) => s + r.free, 0)}</p>
          <p className="text-xs text-slate-500 mt-1">פנויים</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-4 py-3 text-right font-semibold text-slate-500">פריט</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-500">קטגוריה</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-500">בעלות</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500">סה"כ</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500">חתומים</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500">פנויים</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-500">מיקום פנויים</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map(({ type, total, assigned, free, freeLocations, assignedDetails, isSerialized }) => (
              <>
                <tr
                  key={type.id}
                  className={`hover:bg-slate-50 transition-colors cursor-pointer ${expanded === type.id ? 'bg-blue-50' : ''}`}
                  onClick={() => setExpanded(expanded === type.id ? null : type.id)}
                >
                  <td className="px-4 py-3 font-medium text-slate-800">{type.name}</td>
                  <td className="px-4 py-3 text-slate-500">{type.category}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${OWNERSHIP_COLORS[type.ownership]}`}>
                      {OWNERSHIP_LABELS[type.ownership]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-slate-700">{total}</td>
                  <td className="px-4 py-3 text-center">
                    {assigned > 0 ? (
                      <span className="font-bold text-blue-600">{assigned}</span>
                    ) : (
                      <span className="text-slate-300">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-bold ${free === 0 ? 'text-red-500' : 'text-green-600'}`}>{free}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {freeLocations.length > 0
                      ? [...new Set(freeLocations)].join(', ')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {assignedDetails.length > 0 && (
                      expanded === type.id
                        ? <ChevronUp className="w-4 h-4" />
                        : <ChevronDown className="w-4 h-4" />
                    )}
                  </td>
                </tr>

                {expanded === type.id && assignedDetails.length > 0 && (
                  <tr key={`${type.id}-detail`}>
                    <td colSpan={8} className="px-4 pb-4 pt-0 bg-blue-50/50">
                      <div className="rounded-lg border border-blue-100 overflow-hidden">
                        <div className="px-3 py-2 bg-blue-100/50 flex items-center gap-2 text-xs font-semibold text-blue-700">
                          <Users className="w-3.5 h-3.5" />
                          חיילים חתומים על {type.name}
                        </div>
                        <table className="w-full text-xs">
                          <thead className="border-b border-blue-100">
                            <tr className="text-blue-600">
                              <th className="px-3 py-2 text-right font-medium">חייל</th>
                              {isSerialized && <th className="px-3 py-2 text-right font-medium">מ"ס</th>}
                              {!isSerialized && <th className="px-3 py-2 text-right font-medium">כמות</th>}
                              <th className="px-3 py-2 text-right font-medium">סוג/אפיון</th>
                              <th className="px-3 py-2 text-right font-medium">מצב</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-blue-50">
                            {assignedDetails.map((d, i) => (
                              <tr key={i} className="hover:bg-blue-50/50">
                                <td className="px-3 py-2 font-medium text-slate-700">
                                  {d.soldierRank} {d.soldierName}
                                </td>
                                {isSerialized && <td className="px-3 py-2 font-mono text-slate-500">{d.serial ?? '—'}</td>}
                                {!isSerialized && <td className="px-3 py-2 text-slate-600">{(d as any).quantity}</td>}
                                <td className="px-3 py-2 text-slate-500">{d.attribute ?? '—'}</td>
                                <td className="px-3 py-2">
                                  <ConditionBadge condition={d.condition} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-12 text-center text-slate-400 text-sm">אין פריטים להצגה</div>
        )}
      </div>
    </div>
  )
}

function ConditionBadge({ condition }: { condition: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    serviceable: { label: 'תקין',   cls: 'bg-green-100 text-green-700' },
    worn:        { label: 'בלאי',   cls: 'bg-yellow-100 text-yellow-700' },
    damaged:     { label: 'פגום',   cls: 'bg-red-100 text-red-700' },
  }
  const c = map[condition] ?? { label: condition, cls: 'bg-slate-100 text-slate-500' }
  return <span className={`text-xs px-2 py-0.5 rounded-full ${c.cls}`}>{c.label}</span>
}
