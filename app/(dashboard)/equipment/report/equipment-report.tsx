'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChevronDown, ChevronUp, X, Plus, Users, MapPin } from 'lucide-react'

interface Soldier { id: number; full_name: string; rank: string; role_in_unit: string | null; department_id: number | null }
interface Department { id: number; name: string; display_order: number }
interface StorageLocation { id: number; name: string }
interface Assignment {
  id: number
  status: string
  attribute: string | null
  ownership: string
  quantity: number
  condition_in: string
  signed_at: string | null
  returned_at: string | null
  notes: string | null
  performer_name: string | null
  storage_location_id: number | null
  storage_soldier_id: number | null
  storage_location: { id: number; name: string } | null
  storage_soldier: { id: number; full_name: string } | null
  soldier: { id: number; full_name: string; rank: string } | null
  item: { id: number; serial_number: string | null; type: { id: number; name: string; category: string } | null } | null
  type: { id: number; name: string; category: string } | null
}

interface StorageState {
  locationId: number | null
  soldierId: number | null
  locationName: string | null
  soldierName: string | null
}

interface Props {
  soldiers: Soldier[]
  departments: Department[]
  assignments: Assignment[]
  storageLocations: StorageLocation[]
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  active:      { label: 'חתום',    cls: 'bg-blue-100 text-blue-700' },
  planned:     { label: 'מיועד',   cls: 'bg-amber-100 text-amber-700' },
  returned:    { label: 'הוחזר',   cls: 'bg-slate-100 text-slate-500' },
  transferred: { label: 'הועבר',   cls: 'bg-purple-100 text-purple-500' },
  lost:        { label: 'אבד',     cls: 'bg-red-100 text-red-500' },
}

const CONDITION_LABELS: Record<string, string> = {
  serviceable: 'תקין', worn: 'בלאי', damaged: 'פגום',
}

export default function EquipmentReport({ soldiers, departments, assignments, storageLocations }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [showHistory, setShowHistory] = useState<Set<number>>(new Set())
  const [isPending, startTransition] = useTransition()
  const [storageEditId, setStorageEditId] = useState<number | null>(null)
  const [storageSearch, setStorageSearch] = useState('')

  const [assignmentStorage, setAssignmentStorage] = useState<Map<number, StorageState>>(() => {
    const m = new Map<number, StorageState>()
    assignments.forEach(a => {
      if (a.storage_location_id || a.storage_soldier_id) {
        m.set(a.id, {
          locationId: a.storage_location_id ?? null,
          soldierId: a.storage_soldier_id ?? null,
          locationName: a.storage_location?.name ?? null,
          soldierName: a.storage_soldier?.full_name ?? null,
        })
      }
    })
    return m
  })

  const updateStorage = (assignmentId: number, locationId: number | null, soldierId: number | null, locationName: string | null, soldierName: string | null) => {
    startTransition(async () => {
      const supabase = createClient()
      await supabase.from('equipment_assignments')
        .update({ storage_location_id: locationId, storage_soldier_id: soldierId })
        .eq('id', assignmentId)
      setAssignmentStorage(prev => {
        const n = new Map(prev)
        if (locationId || soldierId) {
          n.set(assignmentId, { locationId, soldierId, locationName, soldierName })
        } else {
          n.delete(assignmentId)
        }
        return n
      })
      setStorageEditId(null)
      setStorageSearch('')
    })
  }

  const addSoldier = (id: number) => setSelectedIds(prev => new Set([...prev, id]))
  const removeSoldier = (id: number) => setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n })

  const addDepartment = (deptId: number) => {
    const ids = soldiers.filter(s => s.department_id === deptId).map(s => s.id)
    setSelectedIds(prev => new Set([...prev, ...ids]))
  }

  const toggleExpanded = (id: number) => setExpanded(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n
  })
  const toggleHistory = (id: number) => setShowHistory(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n
  })

  const selectedSoldiers = soldiers.filter(s => selectedIds.has(s.id))
  const unselected = soldiers.filter(s => !selectedIds.has(s.id))

  const soldierAssignments = (soldierId: number) => {
    const all = assignments.filter(a => a.soldier?.id === soldierId)
    const current = all.filter(a => a.status === 'active' || a.status === 'planned')
    const history = all.filter(a => a.status !== 'active' && a.status !== 'planned')
    return { current, history }
  }

  const itemName = (a: Assignment) =>
    a.item?.type?.name ?? a.type?.name ?? '—'
  const itemCategory = (a: Assignment) =>
    a.item?.type?.category ?? a.type?.category ?? ''
  const itemSerial = (a: Assignment) =>
    a.item?.serial_number ?? null

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : '—'

  return (
    <div className="space-y-4" dir="rtl">
      {/* Soldier selector */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-700">בחר חיילים לדוח</p>

        {/* Department quick-add */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-slate-400 self-center">לפי מחלקה:</span>
          {departments.map(d => (
            <button
              key={d.id}
              onClick={() => addDepartment(d.id)}
              className="flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-600 rounded-full text-xs font-medium transition-colors"
            >
              <Users className="w-3 h-3" /> {d.name}
            </button>
          ))}
        </div>

        {/* Manual soldier select */}
        <div className="flex gap-2">
          <select
            onChange={e => { if (e.target.value) { addSoldier(parseInt(e.target.value)); e.target.value = '' } }}
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            defaultValue=""
          >
            <option value="">הוסף חייל...</option>
            {unselected.map(s => (
              <option key={s.id} value={s.id}>{s.full_name}{s.role_in_unit ? ` — ${s.role_in_unit}` : ''}</option>
            ))}
          </select>
          {selectedIds.size > 0 && (
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-2 text-xs text-slate-400 hover:text-red-500 transition-colors"
            >
              נקה הכל
            </button>
          )}
        </div>

        {/* Selected chips */}
        {selectedSoldiers.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selectedSoldiers.map(s => (
              <span key={s.id} className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                {s.full_name}
                <button onClick={() => removeSoldier(s.id)} className="hover:text-red-500 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Empty state */}
      {selectedSoldiers.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-100 py-16 text-center">
          <Users className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">בחר חיילים להצגת הדוח</p>
        </div>
      )}

      {/* Soldier cards */}
      {selectedSoldiers.map(soldier => {
        const { current, history } = soldierAssignments(soldier.id)
        const isOpen = expanded.has(soldier.id)
        const historyOpen = showHistory.has(soldier.id)
        const activeCount = current.filter(a => a.status === 'active').length
        const plannedCount = current.filter(a => a.status === 'planned').length

        // Group current by category
        const grouped = current.reduce<Record<string, Assignment[]>>((acc, a) => {
          const cat = itemCategory(a) || 'אחר'
          ;(acc[cat] = acc[cat] ?? []).push(a)
          return acc
        }, {})

        return (
          <div key={soldier.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            {/* Header */}
            <div
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => toggleExpanded(soldier.id)}
            >
              <div className="flex-1">
                <p className="font-semibold text-slate-800">{soldier.full_name}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {soldier.role_in_unit && <span>{soldier.role_in_unit} · </span>}
                  <span className="text-blue-600 font-medium">{activeCount} חתומים</span>
                  {plannedCount > 0 && <span className="text-amber-500"> · {plannedCount} מיועדים</span>}
                  {history.length > 0 && <span className="text-slate-400"> · {history.length} בהיסטוריה</span>}
                </p>
              </div>
              {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </div>

            {/* Content */}
            {isOpen && (
              <div className="border-t border-slate-100">
                {current.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-6">אין ציוד פעיל</p>
                ) : (
                  Object.entries(grouped).map(([cat, items]) => (
                    <div key={cat}>
                      <div className="px-4 py-1.5 bg-slate-50 text-xs font-semibold text-slate-500">{cat}</div>
                      <table className="w-full text-sm">
                        <tbody className="divide-y divide-slate-50">
                          {items.map(a => {
                            const storage = assignmentStorage.get(a.id)
                            const storageName = storage?.locationName ?? storage?.soldierName ?? null
                            const isEditingStorage = storageEditId === a.id
                            const searchLower = storageSearch.toLowerCase()
                            const filteredLocations = storageLocations.filter(l => !storageSearch || l.name.toLowerCase().includes(searchLower))
                            const filteredSoldiers = soldiers.filter(s => s.id !== a.soldier?.id && (!storageSearch || s.full_name.toLowerCase().includes(searchLower)))
                            return (
                              <tr key={a.id} className="hover:bg-slate-50/50">
                                <td className="px-4 py-2.5 font-medium text-slate-800">
                                  {itemName(a)}
                                  {itemSerial(a) && <span className="text-slate-400 font-mono text-xs mr-2">#{itemSerial(a)}</span>}
                                </td>
                                <td className="px-4 py-2.5 text-slate-500 text-xs">{a.attribute ?? ''}</td>
                                <td className="px-4 py-2.5 text-xs">
                                  {a.quantity > 1 && <span className="text-slate-500">×{a.quantity}</span>}
                                </td>
                                <td className="px-4 py-2.5 text-xs text-slate-400">{CONDITION_LABELS[a.condition_in] ?? a.condition_in}</td>
                                <td className="px-4 py-2.5">
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_LABELS[a.status]?.cls}`}>
                                    {STATUS_LABELS[a.status]?.label}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-xs text-slate-400">{formatDate(a.signed_at)}</td>
                                {/* Storage location cell — only for active assignments */}
                                {a.status === 'active' && (
                                  <td className="px-2 py-2.5">
                                    <div className="flex items-center gap-1">
                                      {storageName && (
                                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full max-w-24 truncate">
                                          {storageName}
                                        </span>
                                      )}
                                      <button
                                        onClick={() => { setStorageEditId(isEditingStorage ? null : a.id); setStorageSearch('') }}
                                        className={`p-1 rounded transition-colors ${isEditingStorage ? 'text-blue-600 bg-blue-100' : 'text-slate-300 hover:text-blue-400 hover:bg-blue-50'}`}
                                        title="שנה מקום אפסון"
                                      >
                                        <MapPin className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                    {isEditingStorage && (
                                      <div className="mt-1 p-2 bg-blue-50 rounded-lg border border-blue-100 min-w-48 z-10">
                                        <input
                                          type="text"
                                          value={storageSearch}
                                          onChange={e => setStorageSearch(e.target.value)}
                                          placeholder="חפש..."
                                          autoFocus
                                          className="w-full border border-slate-200 rounded px-2 py-1 text-xs mb-1.5 focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white"
                                        />
                                        <div className="flex flex-wrap gap-1">
                                          {storage && (
                                            <button
                                              onClick={() => updateStorage(a.id, null, null, null, null)}
                                              className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-red-200 bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                                            >
                                              <X className="w-3 h-3" /> נקה
                                            </button>
                                          )}
                                          {filteredLocations.map(loc => (
                                            <button
                                              key={loc.id}
                                              onClick={() => updateStorage(a.id, loc.id, null, loc.name, null)}
                                              className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${storage?.locationId === loc.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400 hover:text-blue-600'}`}
                                            >
                                              {loc.name}
                                            </button>
                                          ))}
                                          {filteredSoldiers.map(s => (
                                            <button
                                              key={s.id}
                                              onClick={() => updateStorage(a.id, null, s.id, null, s.full_name)}
                                              className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${storage?.soldierId === s.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400 hover:text-indigo-600'}`}
                                            >
                                              {s.full_name}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </td>
                                )}
                                {a.status !== 'active' && <td />}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  ))
                )}

                {/* History toggle */}
                {history.length > 0 && (
                  <div className="border-t border-slate-100">
                    <button
                      onClick={() => toggleHistory(soldier.id)}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <span>היסטוריה ({history.length} פריטים)</span>
                      {historyOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    {historyOpen && (
                      <table className="w-full text-sm">
                        <tbody className="divide-y divide-slate-50">
                          {history.map(a => (
                            <tr key={a.id} className="hover:bg-slate-50/50 opacity-70">
                              <td className="px-4 py-2 text-slate-600">
                                {itemName(a)}
                                {itemSerial(a) && <span className="text-slate-400 font-mono text-xs mr-2">#{itemSerial(a)}</span>}
                              </td>
                              <td className="px-4 py-2 text-slate-400 text-xs">{a.attribute ?? ''}</td>
                              <td className="px-4 py-2">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_LABELS[a.status]?.cls}`}>
                                  {STATUS_LABELS[a.status]?.label}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-xs text-slate-400">
                                {a.returned_at ? `הוחזר ${formatDate(a.returned_at)}` : formatDate(a.signed_at)}
                              </td>
                              <td className="px-4 py-2 text-xs text-slate-300">
                                {a.performer_name ?? ''}
                                {a.notes && <span className="text-slate-400 mr-1">{a.notes}</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
