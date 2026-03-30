'use client'

import { useState, useMemo, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Check, Printer, MessageCircle, Save, X, ChevronLeft, MapPin } from 'lucide-react'

interface Template { id: number; name: string; items: { type_id: number }[] }
interface StorageLocation { id: number; name: string }
interface Soldier { id: number; full_name: string }
interface Assignment {
  id: number; attribute: string | null; quantity: number
  storage_location_id: number | null; storage_soldier_id: number | null
  storage_location: { id: number; name: string } | null
  storage_soldier: { id: number; full_name: string } | null
  soldier: { id: number; full_name: string } | null
  item: { id: number; serial_number: string | null; type: { id: number; name: string; category: string } | null } | null
  type: { id: number; name: string; category: string } | null
}
interface StorageState {
  locationId: number | null; soldierId: number | null
  locationName: string | null; soldierName: string | null
}
interface Props {
  templates: Template[]
  assignments: Assignment[]
  storageLocations: StorageLocation[]
  soldiers: Soldier[]
}

const getTypeName = (a: Assignment) => a.item?.type?.name ?? a.type?.name ?? '—'
const getTypeId   = (a: Assignment) => a.item?.type?.id  ?? a.type?.id  ?? -1

const itemDetail = (a: Assignment) => {
  const parts: string[] = []
  if (a.item?.serial_number) parts.push(`#${a.item.serial_number}`)
  if (a.attribute) parts.push(`(${a.attribute})`)
  if (!a.item && a.quantity > 1) parts.push(`×${a.quantity}`)
  return parts.join(' ')
}

export default function TrackingClient({ templates, assignments, storageLocations, soldiers }: Props) {
  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState<'setup' | 'check'>('setup')
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().split('T')[0])
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<number>>(new Set())
  const [checks, setChecks] = useState<Map<number, boolean>>(new Map())
  const [saved, setSaved] = useState(false)

  // Storage state (same mechanism as green-eyes)
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
  const [storageEditId, setStorageEditId] = useState<number | null>(null)
  const [storageSearch, setStorageSearch] = useState('')

  const displayDate = new Date(reportDate + 'T12:00:00').toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })

  // Union of type IDs from all selected templates
  const templateTypeIds = useMemo(() => {
    if (selectedTemplateIds.size === 0) return null // null = all
    const ids = new Set<number>()
    templates.filter(t => selectedTemplateIds.has(t.id)).forEach(t => t.items.forEach(i => ids.add(i.type_id)))
    return ids
  }, [selectedTemplateIds, templates])

  const filteredAssignments = useMemo(() => {
    if (!templateTypeIds) return assignments
    return assignments.filter(a => {
      const id = getTypeId(a)
      return id !== -1 && templateTypeIds.has(id)
    })
  }, [templateTypeIds, assignments])

  // Group by type name, sorted alphabetically
  const groups = useMemo(() => {
    const map = new Map<string, Assignment[]>()
    filteredAssignments.forEach(a => {
      const name = getTypeName(a)
      if (!map.has(name)) map.set(name, [])
      map.get(name)!.push(a)
    })
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], 'he'))
  }, [filteredAssignments])

  const totalItems   = filteredAssignments.length
  const checkedItems = filteredAssignments.filter(a => checks.get(a.id) === true).length

  const startCheck = () => {
    const init = new Map<number, boolean>()
    filteredAssignments.forEach(a => init.set(a.id, false))
    setChecks(init)
    setStep('check')
    setSaved(false)
    setStorageEditId(null)
  }

  const toggle = (id: number) =>
    setChecks(prev => { const n = new Map(prev); n.set(id, !n.get(id)); return n })

  const checkAllInGroup = (items: Assignment[]) =>
    setChecks(prev => { const n = new Map(prev); items.forEach(a => n.set(a.id, true)); return n })

  const saveReport = () => {
    startTransition(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { data: report, error } = await supabase
        .from('equipment_tracking_reports')
        .insert({ report_date: reportDate, template_ids: Array.from(selectedTemplateIds), performed_by: user?.id ?? null })
        .select('id').single()
      if (error || !report) return
      const rows = filteredAssignments.map(a => {
        const storage = assignmentStorage.get(a.id)
        return {
          report_id: report.id,
          assignment_id: a.id,
          is_present: checks.get(a.id) ?? false,
          snapshot_soldier_name: a.soldier?.full_name ?? null,
          snapshot_storage_name: storage?.locationName ?? storage?.soldierName ?? null,
        }
      })
      if (rows.length) await supabase.from('equipment_tracking_checks').insert(rows)
      setSaved(true)
    })
  }

  const updateStorage = (assignmentId: number, locationId: number | null, soldierId: number | null, locationName: string | null, soldierName: string | null) => {
    startTransition(async () => {
      const supabase = createClient()
      await supabase.from('equipment_assignments')
        .update({ storage_location_id: locationId, storage_soldier_id: soldierId })
        .eq('id', assignmentId)
      setAssignmentStorage(prev => {
        const n = new Map(prev)
        if (locationId || soldierId) n.set(assignmentId, { locationId, soldierId, locationName, soldierName })
        else n.delete(assignmentId)
        return n
      })
      setStorageEditId(null)
      setStorageSearch('')
    })
  }

  const shareWhatsApp = () => {
    const templateNames = selectedTemplateIds.size > 0
      ? templates.filter(t => selectedTemplateIds.has(t.id)).map(t => t.name).join(', ')
      : 'כל הציוד'
    let text = `מעקב ציוד יומי — ${displayDate}\nציוד: ${templateNames}\n\n`
    groups.forEach(([typeName, items]) => {
      const present = items.filter(a => checks.get(a.id))
      const missing = items.filter(a => !checks.get(a.id))
      text += `${missing.length === 0 ? '✅' : '⚠️'} ${typeName} — ${present.length}/${items.length}\n`
      missing.forEach(a => {
        const detail = itemDetail(a)
        const soldierName = a.soldier?.full_name
        text += `  חסר: ${detail || ''}${soldierName ? ` (${soldierName})` : ''}\n`
      })
    })
    text += `\nסה"כ: ${checkedItems}/${totalItems}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const toggleTemplate = (id: number) =>
    setSelectedTemplateIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  /* ── SETUP ── */
  if (step === 'setup') {
    return (
      <div className="space-y-4" dir="rtl">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 space-y-5">

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">תאריך</label>
            <input
              type="date"
              value={reportDate}
              onChange={e => setReportDate(e.target.value)}
              className="w-48 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          </div>

          {templates.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-700">
                סינון לפי תבנית ציוד
                <span className="font-normal text-slate-400 text-xs mr-2">ניתן לבחור כמה תבניות</span>
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedTemplateIds(new Set())}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    selectedTemplateIds.size === 0
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  כל הציוד
                </button>
                {templates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => toggleTemplate(t.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      selectedTemplateIds.has(t.id)
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={startCheck}
            disabled={totalItems === 0}
            className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg py-3 text-sm font-semibold transition-colors"
          >
            {totalItems === 0
              ? 'אין פריטים תואמים'
              : `התחל בדיקה — ${totalItems} פריטים ב-${groups.length} סוגים`}
          </button>
        </div>
      </div>
    )
  }

  /* ── CHECK ── */
  const selectedTemplateNames = selectedTemplateIds.size > 0
    ? templates.filter(t => selectedTemplateIds.has(t.id)).map(t => t.name).join(', ')
    : 'כל הציוד'

  return (
    <>
      <style>{`
        @page { size: A4; margin: 15mm; }
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; }
          table { page-break-inside: auto; border-collapse: collapse; }
          tr { page-break-inside: avoid; }
        }
        .print-only { display: none; }
      `}</style>

      <div className="space-y-3" dir="rtl">

        {/* Sticky action bar */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-3 no-print">
          <div className="flex items-center gap-2 flex-wrap justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => setStep('setup')} className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div>
                <p className="font-semibold text-slate-800 text-sm">{displayDate}</p>
                <p className="text-xs text-slate-400 truncate max-w-48">{selectedTemplateNames}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className={`text-sm font-bold px-3 py-1.5 rounded-lg tabular-nums ${
                checkedItems === totalItems && totalItems > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {checkedItems}/{totalItems}
              </div>

              {saved && <span className="text-xs text-green-600 font-medium">✓ נשמר</span>}

              <button
                onClick={saveReport}
                disabled={isPending || saved}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                {isPending ? '...' : 'שמור'}
              </button>

              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                <Printer className="w-3.5 h-3.5" /> PDF
              </button>

              <button
                onClick={shareWhatsApp}
                className="flex items-center gap-1.5 px-3 py-1.5 text-white rounded-lg text-xs font-semibold transition-colors"
                style={{ backgroundColor: '#25D366' }}
              >
                <MessageCircle className="w-3.5 h-3.5" /> וואטסאפ
              </button>
            </div>
          </div>

          <div className="mt-2.5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all duration-300 rounded-full"
              style={{ width: totalItems > 0 ? `${(checkedItems / totalItems) * 100}%` : '0' }}
            />
          </div>
        </div>

        {/* Equipment type groups */}
        <div className="no-print space-y-3">
          {groups.map(([typeName, items]) => {
            const cnt = items.filter(a => checks.get(a.id) === true).length
            const allDone = items.length > 0 && cnt === items.length

            return (
              <div
                key={typeName}
                className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-colors ${allDone ? 'border-amber-300' : 'border-slate-100'}`}
              >
                {/* Group header */}
                <div className={`flex items-center justify-between px-4 py-3 ${allDone ? 'bg-amber-50' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                      allDone ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {allDone ? <Check className="w-4 h-4" /> : <span className="text-xs">{cnt}</span>}
                    </div>
                    <p className="font-semibold text-slate-800 text-sm">{typeName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium tabular-nums ${allDone ? 'text-amber-600' : 'text-slate-400'}`}>
                      {cnt}/{items.length}
                    </span>
                    {!allDone && (
                      <button
                        onClick={() => checkAllInGroup(items)}
                        className="text-xs text-amber-600 hover:text-amber-800 font-medium px-2 py-1 rounded hover:bg-amber-50 transition-colors"
                      >
                        סמן הכל
                      </button>
                    )}
                  </div>
                </div>

                {/* Item rows */}
                <div className="border-t border-slate-100 divide-y divide-slate-50">
                  {items.map(a => {
                    const checked = checks.get(a.id) === true
                    const detail = itemDetail(a)
                    const soldierName = a.soldier?.full_name ?? null
                    const storage = assignmentStorage.get(a.id)
                    const storageName = storage?.locationName ?? storage?.soldierName ?? null
                    const isEditingStorage = storageEditId === a.id
                    const searchLower = storageSearch.toLowerCase()
                    const filteredLocations = storageLocations.filter(l => !storageSearch || l.name.toLowerCase().includes(searchLower))
                    const filteredSoldiers = soldiers.filter(s => !storageSearch || s.full_name.toLowerCase().includes(searchLower))

                    return (
                      <div key={a.id}>
                        <div className={`flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${checked ? 'bg-amber-50/40' : 'hover:bg-slate-50'}`}>
                          <button onClick={() => toggle(a.id)} className="flex items-center gap-3 flex-1 text-right min-w-0">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                              checked ? 'bg-amber-500 border-amber-500' : 'border-slate-300'
                            }`}>
                              {checked && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <div className={`flex-1 min-w-0 text-right ${checked ? 'opacity-50' : ''}`}>
                              {detail && (
                                <span className="font-mono text-xs text-slate-500 ml-2">{detail}</span>
                              )}
                              {soldierName && (
                                <span className={`text-xs ${checked ? 'text-slate-400 line-through' : 'text-slate-600'}`}>
                                  {soldierName}
                                </span>
                              )}
                              {!detail && !soldierName && <span className="text-slate-400 text-xs">—</span>}
                            </div>
                          </button>

                          <div className="flex items-center gap-1 shrink-0">
                            {storageName && (
                              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full max-w-28 truncate">
                                {storageName}
                              </span>
                            )}
                            <button
                              onClick={() => { setStorageEditId(isEditingStorage ? null : a.id); setStorageSearch('') }}
                              className={`p-1 rounded transition-colors ${
                                isEditingStorage ? 'text-blue-600 bg-blue-100' : 'text-slate-300 hover:text-blue-400 hover:bg-blue-50'
                              }`}
                              title="שנה מקום אפסון"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {isEditingStorage && (
                          <div className="px-4 pb-3 pt-1 bg-blue-50/50 border-b border-blue-100">
                            <p className="text-xs font-semibold text-slate-500 mb-2">מקום אפסון</p>
                            <input
                              type="text"
                              value={storageSearch}
                              onChange={e => setStorageSearch(e.target.value)}
                              placeholder="חפש מיקום או חייל..."
                              autoFocus
                              className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs mb-2 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                            />
                            <div className="flex flex-wrap gap-1.5">
                              {storage && (
                                <button
                                  onClick={() => updateStorage(a.id, null, null, null, null)}
                                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-red-200 bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                                >
                                  <X className="w-3 h-3" /> נקה אפסון
                                </button>
                              )}
                              {filteredLocations.map(loc => (
                                <button
                                  key={loc.id}
                                  onClick={() => updateStorage(a.id, loc.id, null, loc.name, null)}
                                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                                    storage?.locationId === loc.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400 hover:text-blue-600'
                                  }`}
                                >
                                  {loc.name}
                                </button>
                              ))}
                              {filteredSoldiers.map(s => (
                                <button
                                  key={s.id}
                                  onClick={() => updateStorage(a.id, null, s.id, null, s.full_name)}
                                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                                    storage?.soldierId === s.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400 hover:text-indigo-600'
                                  }`}
                                >
                                  {s.full_name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

      </div>

      {/* Print-only view */}
      <div className="print-only" dir="rtl" style={{ fontFamily: 'Arial, sans-serif', fontSize: 13 }}>
        <div style={{ borderBottom: '2px solid #222', paddingBottom: 6, marginBottom: 12 }}>
          <h2 style={{ fontSize: 18, fontWeight: 'bold', margin: 0 }}>מעקב ציוד יומי — {displayDate}</h2>
          <p style={{ fontSize: 11, color: '#666', margin: '3px 0 0' }}>
            ציוד: {selectedTemplateNames} · סה&quot;כ: {checkedItems}/{totalItems} פריטים
          </p>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f0f0f0' }}>
              <th style={{ padding: '4px 8px', border: '1px solid #ccc', textAlign: 'right' }}>סוג ציוד</th>
              <th style={{ padding: '4px 8px', border: '1px solid #ccc', textAlign: 'right' }}>מ&quot;ס / פרטים</th>
              <th style={{ padding: '4px 8px', border: '1px solid #ccc', textAlign: 'right' }}>חייל</th>
              <th style={{ padding: '4px 8px', border: '1px solid #ccc', textAlign: 'right' }}>מקום אפסון</th>
              <th style={{ padding: '4px 8px', border: '1px solid #ccc', textAlign: 'center', width: 40 }}>קיים</th>
            </tr>
          </thead>
          <tbody>
            {groups.flatMap(([typeName, items]) =>
              items.map(a => {
                const checked = checks.get(a.id) === true
                const storage = assignmentStorage.get(a.id)
                return (
                  <tr key={a.id} style={{ background: checked ? '#f0fff4' : '#fff' }}>
                    <td style={{ padding: '4px 8px', border: '1px solid #ddd', fontWeight: 500 }}>{typeName}</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #ddd', fontFamily: 'monospace', fontSize: 11 }}>{itemDetail(a) || '—'}</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #ddd', fontSize: 11 }}>{a.soldier?.full_name ?? '—'}</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #ddd', fontSize: 11 }}>{storage?.locationName ?? storage?.soldierName ?? '—'}</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #ddd', textAlign: 'center' }}>{checked ? '✅' : '⬜'}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
