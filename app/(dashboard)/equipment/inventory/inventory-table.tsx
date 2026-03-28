'use client'

import { useState } from 'react'
import type { EquipmentType, EquipmentItem, EquipmentAssignment } from '@/lib/types/database'
import { ChevronDown, ChevronUp, Users, ArrowUpDown } from 'lucide-react'

const OWNERSHIP_LABELS: Record<string, string> = {
  personal: 'אישי', platoon: 'פלוגתי', battalion: 'גדודי',
}
const OWNERSHIP_COLORS: Record<string, string> = {
  personal: 'bg-purple-100 text-purple-700',
  platoon:  'bg-blue-100 text-blue-700',
  battalion:'bg-amber-100 text-amber-700',
}

type SortCol = 'name' | 'category' | 'ownership' | 'free' | 'planned' | 'active'
type SortDir = 'asc' | 'desc'

interface Props {
  types: EquipmentType[]
  items: EquipmentItem[]
  assignments: (EquipmentAssignment & { soldier?: { id: number; full_name: string; rank: string; department_id: number | null } | null })[]
}

export default function InventoryTable({ types, items, assignments }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [filterOwnership, setFilterOwnership] = useState<string>('')
  const [filterCategories, setFilterCategories] = useState<Set<string>>(new Set())
  const [sortCol, setSortCol] = useState<SortCol>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const categories = [...new Set(types.map(t => t.category))].sort()

  const toggleCategory = (cat: string) => {
    setFilterCategories(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  const handleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  // For each type: calculate stats
  const stats = types.map(type => {
    if (type.is_serialized) {
      const typeItems = items.filter(i => i.type_id === type.id)
      const activeItemIds = new Set(assignments.filter(a => a.item_id != null && a.status === 'active').map(a => a.item_id!))
      const plannedItemIds = new Set(assignments.filter(a => a.item_id != null && a.status === 'planned').map(a => a.item_id!))
      const assignedItemIds = new Set([...activeItemIds, ...plannedItemIds])
      const total = typeItems.length
      const active = typeItems.filter(i => activeItemIds.has(i.id)).length
      const planned = typeItems.filter(i => plannedItemIds.has(i.id)).length
      const assignedDetails = assignments
        .filter(a => a.item_id != null && typeItems.some(i => i.id === a.item_id))
        .map(a => ({
          serial: typeItems.find(i => i.id === a.item_id)?.serial_number ?? String(a.item_id),
          soldierName: a.soldier?.full_name ?? '—',
          soldierRank: a.soldier?.rank ?? '',
          condition: a.condition_in,
          attribute: a.attribute,
          location: typeItems.find(i => i.id === a.item_id)?.location,
          status: a.status,
        }))
      const freeLocations = typeItems
        .filter(i => !assignedItemIds.has(i.id))
        .map(i => i.location)
        .filter(Boolean) as string[]
      return { type, total, active, planned, free: total - active - planned, assignedDetails, freeLocations, isSerialized: true }
    } else {
      const inventoryQty = items.filter(i => i.type_id === type.id).reduce((s, i) => s + (i.quantity ?? 0), 0)
      const activeQty = assignments.filter(a => a.type_id === type.id && a.status === 'active').reduce((s, a) => s + a.quantity, 0)
      const plannedQty = assignments.filter(a => a.type_id === type.id && a.status === 'planned').reduce((s, a) => s + a.quantity, 0)
      const total = inventoryQty + activeQty + plannedQty
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
          status: a.status,
        }))
      const freeLocations = items
        .filter(i => i.type_id === type.id && i.location)
        .map(i => i.location!)
      return { type, total, active: activeQty, planned: plannedQty, free: inventoryQty, assignedDetails, freeLocations, isSerialized: false }
    }
  })

  // Filter
  const filtered = stats.filter(s => {
    if (search && !s.type.name.includes(search) && !s.type.category.includes(search)) return false
    if (filterOwnership && s.type.ownership !== filterOwnership) return false
    if (filterCategories.size > 0 && !filterCategories.has(s.type.category)) return false
    return true
  })

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0
    switch (sortCol) {
      case 'name':      cmp = a.type.name.localeCompare(b.type.name, 'he'); break
      case 'category':  cmp = a.type.category.localeCompare(b.type.category, 'he'); break
      case 'ownership': cmp = a.type.ownership.localeCompare(b.type.ownership); break
      case 'free':      cmp = a.free - b.free; break
      case 'planned':   cmp = a.planned - b.planned; break
      case 'active':    cmp = a.active - b.active; break
    }
    return sortDir === 'asc' ? cmp : -cmp
  })

  const SortIcon = ({ col }: { col: SortCol }) => {
    if (sortCol !== col) return <ArrowUpDown className="w-3 h-3 text-slate-300 inline mr-1" />
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 inline mr-1" />
      : <ChevronDown className="w-3 h-3 inline mr-1" />
  }

  const thClass = "px-4 py-3 font-semibold text-slate-500 cursor-pointer hover:text-slate-700 select-none whitespace-nowrap"

  return (
    <div className="space-y-4" dir="rtl">
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 space-y-3">
        <div className="flex flex-wrap gap-3">
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

        {/* Category chips */}
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-slate-400 self-center ml-1">קטגוריות:</span>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                filterCategories.has(cat)
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
          {filterCategories.size > 0 && (
            <button
              onClick={() => setFilterCategories(new Set())}
              className="px-2.5 py-1 rounded-full text-xs text-slate-400 hover:text-red-500 transition-colors"
            >
              נקה
            </button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 text-center">
          <p className="text-2xl font-bold text-slate-800">{sorted.reduce((s, r) => s + r.total, 0)}</p>
          <p className="text-xs text-slate-500 mt-1">סה"כ פריטים</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{sorted.reduce((s, r) => s + r.free, 0)}</p>
          <p className="text-xs text-slate-500 mt-1">פנויים</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 text-center">
          <p className="text-2xl font-bold text-amber-500">{sorted.reduce((s, r) => s + r.planned, 0)}</p>
          <p className="text-xs text-slate-500 mt-1">מיועדים</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{sorted.reduce((s, r) => s + r.active, 0)}</p>
          <p className="text-xs text-slate-500 mt-1">חתומים</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className={`${thClass} text-right`} onClick={() => handleSort('name')}>
                <SortIcon col="name" />פריט
              </th>
              <th className={`${thClass} text-right`} onClick={() => handleSort('category')}>
                <SortIcon col="category" />קטגוריה
              </th>
              <th className={`${thClass} text-right`} onClick={() => handleSort('ownership')}>
                <SortIcon col="ownership" />בעלות
              </th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500">סה"כ</th>
              <th className={`${thClass} text-center text-green-600`} onClick={() => handleSort('free')}>
                <SortIcon col="free" />פנויים
              </th>
              <th className={`${thClass} text-center text-amber-500`} onClick={() => handleSort('planned')}>
                <SortIcon col="planned" />מיועדים
              </th>
              <th className={`${thClass} text-center text-blue-600`} onClick={() => handleSort('active')}>
                <SortIcon col="active" />חתומים
              </th>
              <th className="px-4 py-3 text-right font-semibold text-slate-500">מיקום פנויים</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {sorted.map(({ type, total, active, planned, free, freeLocations, assignedDetails, isSerialized }) => (
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
                    <span className={`font-bold ${free === 0 ? 'text-red-500' : 'text-green-600'}`}>{free}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {planned > 0 ? <span className="font-bold text-amber-500">{planned}</span> : <span className="text-slate-300">0</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {active > 0 ? <span className="font-bold text-blue-600">{active}</span> : <span className="text-slate-300">0</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {freeLocations.length > 0 ? [...new Set(freeLocations)].join(', ') : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {assignedDetails.length > 0 && (
                      expanded === type.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </td>
                </tr>

                {expanded === type.id && assignedDetails.length > 0 && (
                  <tr key={`${type.id}-detail`}>
                    <td colSpan={9} className="px-4 pb-4 pt-0 bg-blue-50/50">
                      <div className="rounded-lg border border-blue-100 overflow-hidden">
                        <div className="px-3 py-2 bg-blue-100/50 flex items-center gap-2 text-xs font-semibold text-blue-700">
                          <Users className="w-3.5 h-3.5" />
                          שיוכים ל-{type.name}
                        </div>
                        <table className="w-full text-xs">
                          <thead className="border-b border-blue-100">
                            <tr className="text-blue-600">
                              <th className="px-3 py-2 text-right font-medium">חייל</th>
                              {isSerialized && <th className="px-3 py-2 text-right font-medium">מ"ס</th>}
                              {!isSerialized && <th className="px-3 py-2 text-right font-medium">כמות</th>}
                              <th className="px-3 py-2 text-right font-medium">אפיון</th>
                              <th className="px-3 py-2 text-right font-medium">מצב</th>
                              <th className="px-3 py-2 text-right font-medium">סטטוס</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-blue-50">
                            {assignedDetails.map((d, i) => (
                              <tr key={i} className="hover:bg-blue-50/50">
                                <td className="px-3 py-2 font-medium text-slate-700">{d.soldierName}</td>
                                {isSerialized && <td className="px-3 py-2 font-mono text-slate-500">{d.serial ?? '—'}</td>}
                                {!isSerialized && <td className="px-3 py-2 text-slate-600">{(d as any).quantity}</td>}
                                <td className="px-3 py-2 text-slate-500">{d.attribute ?? '—'}</td>
                                <td className="px-3 py-2"><ConditionBadge condition={d.condition} /></td>
                                <td className="px-3 py-2">
                                  {(d as any).status === 'planned'
                                    ? <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">מיועד</span>
                                    : <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">חתום</span>
                                  }
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

        {sorted.length === 0 && (
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
