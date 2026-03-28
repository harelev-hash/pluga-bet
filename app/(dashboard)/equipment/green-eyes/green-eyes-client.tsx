'use client'

import { useState, useMemo, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Check, Printer, MessageCircle, Save, X, ChevronLeft } from 'lucide-react'

interface Soldier { id: number; full_name: string; rank: string; role_in_unit: string | null; department_id: number | null }
interface Department { id: number; name: string; display_order: number }
interface Template { id: number; name: string; items: { type_id: number }[] }
interface Assignment {
  id: number; status: string; attribute: string | null; quantity: number
  soldier: { id: number } | null
  item: { id: number; serial_number: string | null; type: { id: number; name: string; category: string } | null } | null
  type: { id: number; name: string; category: string } | null
}

interface Props {
  soldiers: Soldier[]
  departments: Department[]
  templates: Template[]
  assignments: Assignment[]
}

const itemLabel = (a: Assignment) => {
  const name = a.item?.type?.name ?? a.type?.name ?? '—'
  const serial = a.item?.serial_number ? ` #${a.item.serial_number}` : ''
  const attr = a.attribute ? ` (${a.attribute})` : ''
  const qty = !a.item && a.quantity > 1 ? ` ×${a.quantity}` : ''
  return `${name}${serial}${attr}${qty}`
}

export default function GreenEyesClient({ soldiers, departments, templates, assignments }: Props) {
  const [isPending, startTransition] = useTransition()

  const [step, setStep] = useState<'setup' | 'check'>('setup')
  const [departmentId, setDepartmentId] = useState<number | null>(null)
  const [templateId, setTemplateId] = useState<number | null>(null)
  const [excludedIds, setExcludedIds] = useState<Set<number>>(new Set())
  // assignmentId → true (present) | false (missing) | undefined (unchecked)
  const [checks, setChecks] = useState<Map<number, boolean>>(new Map())
  const [saved, setSaved] = useState(false)

  const today = new Date().toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const templateTypeIds = useMemo(() => {
    if (!templateId) return null
    const tmpl = templates.find(t => t.id === templateId)
    return tmpl ? new Set(tmpl.items.map(i => i.type_id)) : null
  }, [templateId, templates])

  const deptSoldiers = useMemo(() =>
    departmentId ? soldiers.filter(s => s.department_id === departmentId && !excludedIds.has(s.id)) : []
  , [departmentId, excludedIds, soldiers])

  const deptSoldiersAll = useMemo(() =>
    departmentId ? soldiers.filter(s => s.department_id === departmentId) : []
  , [departmentId, soldiers])

  const soldierAssignments = (soldierId: number) => {
    const all = assignments.filter(a => a.soldier?.id === soldierId)
    if (!templateTypeIds) return all
    return all.filter(a => {
      const typeId = a.item?.type?.id ?? a.type?.id
      return typeId != null && templateTypeIds.has(typeId)
    })
  }

  const totalItems = deptSoldiers.reduce((s, sol) => s + soldierAssignments(sol.id).length, 0)
  const checkedItems = deptSoldiers.reduce((s, sol) =>
    s + soldierAssignments(sol.id).filter(a => checks.get(a.id) === true).length, 0)

  const startCheck = () => {
    const init = new Map<number, boolean>()
    deptSoldiers.forEach(s => soldierAssignments(s.id).forEach(a => init.set(a.id, false)))
    setChecks(init)
    setStep('check')
    setSaved(false)
  }

  const toggle = (id: number) =>
    setChecks(prev => { const n = new Map(prev); n.set(id, !n.get(id)); return n })

  const checkAll = (soldierId: number) =>
    setChecks(prev => {
      const n = new Map(prev)
      soldierAssignments(soldierId).forEach(a => n.set(a.id, true))
      return n
    })

  const saveReport = () => {
    startTransition(async () => {
      const supabase = createClient()
      const { data: report, error } = await supabase
        .from('green_eyes_reports')
        .insert({ report_date: new Date().toISOString().split('T')[0], department_id: departmentId, template_id: templateId })
        .select('id').single()
      if (error || !report) return

      const rows = deptSoldiers.flatMap(s =>
        soldierAssignments(s.id).map(a => ({
          report_id: report.id, soldier_id: s.id, assignment_id: a.id,
          is_present: checks.get(a.id) ?? false,
        }))
      )
      if (rows.length) await supabase.from('green_eyes_checks').insert(rows)
      setSaved(true)
    })
  }

  const shareWhatsApp = () => {
    const dept = departments.find(d => d.id === departmentId)
    const tmpl = templateId ? templates.find(t => t.id === templateId) : null
    let text = `ירוק בעיניים — ${dept?.name ?? ''} — ${today}\n`
    if (tmpl) text += `תבנית: ${tmpl.name}\n`
    text += '\n'
    deptSoldiers.forEach(s => {
      const sA = soldierAssignments(s.id)
      const cnt = sA.filter(a => checks.get(a.id)).length
      text += `${cnt === sA.length ? '✅' : '⚠️'} ${s.full_name} — ${cnt}/${sA.length}\n`
      const missing = sA.filter(a => !checks.get(a.id))
      if (missing.length) text += `  חסר: ${missing.map(itemLabel).join(', ')}\n`
    })
    text += `\nסה"כ: ${checkedItems}/${totalItems}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  /* ── SETUP STEP ── */
  if (step === 'setup') {
    return (
      <div className="space-y-4" dir="rtl">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 space-y-5">

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">מחלקה</label>
              <select
                value={departmentId ?? ''}
                onChange={e => { setDepartmentId(e.target.value ? parseInt(e.target.value) : null); setExcludedIds(new Set()) }}
                className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
              >
                <option value="">בחר מחלקה...</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">תבנית ציוד</label>
              <select
                value={templateId ?? ''}
                onChange={e => setTemplateId(e.target.value ? parseInt(e.target.value) : null)}
                className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
              >
                <option value="">כל הציוד</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>

          {deptSoldiersAll.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-700">
                חיילים במחלקה
                <span className="font-normal text-slate-400 text-xs mr-2">לחץ להסרה מהדוח</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {deptSoldiersAll.map(s => {
                  const excluded = excludedIds.has(s.id)
                  return (
                    <button
                      key={s.id}
                      onClick={() => setExcludedIds(prev => { const n = new Set(prev); n.has(s.id) ? n.delete(s.id) : n.add(s.id); return n })}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        excluded ? 'bg-slate-100 text-slate-400 line-through' : 'bg-green-50 text-green-700 border border-green-200'
                      }`}
                    >
                      {excluded ? <X className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                      {s.full_name}
                    </button>
                  )
                })}
              </div>
              {excludedIds.size > 0 && (
                <p className="text-xs text-slate-400">{excludedIds.size} חיילים לא יופיעו בדוח</p>
              )}
            </div>
          )}

          <button
            onClick={startCheck}
            disabled={!departmentId || deptSoldiers.length === 0}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg py-3 text-sm font-semibold transition-colors"
          >
            {departmentId && deptSoldiers.length === 0
              ? 'אין חיילים במחלקה'
              : `התחל בדיקה${deptSoldiers.length > 0 ? ` — ${deptSoldiers.length} חיילים` : ''}`}
          </button>
        </div>
      </div>
    )
  }

  /* ── CHECK STEP ── */
  const dept = departments.find(d => d.id === departmentId)
  const tmpl = templateId ? templates.find(t => t.id === templateId) : null

  return (
    <>
      <style>{`@media print {
        .no-print { display: none !important; }
        .print-only { display: block !important; }
        body { background: white !important; }
      }
      .print-only { display: none; }`}
      </style>

      <div className="space-y-3" dir="rtl">

        {/* Sticky action bar */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-3 no-print">
          <div className="flex items-center gap-2 flex-wrap justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setStep('setup')}
                className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div>
                <p className="font-semibold text-slate-800 text-sm">{dept?.name} — {today}</p>
                {tmpl && <p className="text-xs text-slate-400">תבנית: {tmpl.name}</p>}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Progress */}
              <div className={`text-sm font-bold px-3 py-1.5 rounded-lg tabular-nums ${
                checkedItems === totalItems && totalItems > 0 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {checkedItems}/{totalItems}
              </div>

              {saved && <span className="text-xs text-green-600 font-medium">✓ נשמר</span>}

              <button
                onClick={saveReport}
                disabled={isPending || saved}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors"
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

          {/* Progress bar */}
          <div className="mt-2.5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-300 rounded-full"
              style={{ width: totalItems > 0 ? `${(checkedItems / totalItems) * 100}%` : '0' }}
            />
          </div>
        </div>

        {/* Soldier cards */}
        {deptSoldiers.map(soldier => {
          const sA = soldierAssignments(soldier.id)
          const cnt = sA.filter(a => checks.get(a.id) === true).length
          const allDone = sA.length > 0 && cnt === sA.length

          return (
            <div
              key={soldier.id}
              className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-colors ${allDone ? 'border-green-300' : 'border-slate-100'}`}
            >
              {/* Soldier header */}
              <div className={`flex items-center justify-between px-4 py-3 ${allDone ? 'bg-green-50' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    allDone ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {allDone ? <Check className="w-4 h-4" /> : <span className="text-xs">{cnt}</span>}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{soldier.full_name}</p>
                    {soldier.role_in_unit && <p className="text-xs text-slate-400">{soldier.role_in_unit}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium tabular-nums ${allDone ? 'text-green-600' : 'text-slate-400'}`}>
                    {cnt}/{sA.length}
                  </span>
                  {!allDone && sA.length > 0 && (
                    <button
                      onClick={() => checkAll(soldier.id)}
                      className="text-xs text-green-600 hover:text-green-800 font-medium px-2 py-1 rounded hover:bg-green-50 transition-colors"
                    >
                      סמן הכל
                    </button>
                  )}
                </div>
              </div>

              {/* Equipment items */}
              {sA.length === 0 ? (
                <p className="px-4 py-3 text-xs text-slate-400 border-t border-slate-100">אין ציוד רשום</p>
              ) : (
                <div className="border-t border-slate-100 divide-y divide-slate-50">
                  {sA.map(a => {
                    const checked = checks.get(a.id) === true
                    return (
                      <button
                        key={a.id}
                        onClick={() => toggle(a.id)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-right transition-colors ${checked ? 'bg-green-50/60' : 'hover:bg-slate-50'}`}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                          checked ? 'bg-green-500 border-green-500' : 'border-slate-300'
                        }`}>
                          {checked && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className={`flex-1 ${checked ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                          {itemLabel(a)}
                        </span>
                        {a.status === 'planned' && (
                          <span className="text-xs text-amber-500 shrink-0">מיועד</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

      </div>

      {/* Print-only view — compact summary */}
      <div className="print-only" dir="rtl" style={{ fontFamily: 'Arial, sans-serif', fontSize: 13 }}>
        <div style={{ borderBottom: '2px solid #222', paddingBottom: 6, marginBottom: 12 }}>
          <h2 style={{ fontSize: 18, fontWeight: 'bold', margin: 0 }}>
            ירוק בעיניים — {dept?.name} — {today}
          </h2>
          <p style={{ fontSize: 11, color: '#666', margin: '3px 0 0' }}>
            {tmpl ? `תבנית: ${tmpl.name} · ` : ''}סה&quot;כ: {checkedItems}/{totalItems} פריטים · {deptSoldiers.filter(s => soldierAssignments(s.id).every(a => checks.get(a.id))).length}/{deptSoldiers.length} חיילים תקינים
          </p>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f0f0f0' }}>
              <th style={{ padding: '4px 8px', border: '1px solid #ccc', textAlign: 'right' }}>חייל</th>
              <th style={{ padding: '4px 8px', border: '1px solid #ccc', textAlign: 'center', width: 60 }}>סטטוס</th>
              <th style={{ padding: '4px 8px', border: '1px solid #ccc', textAlign: 'right' }}>קיים</th>
              <th style={{ padding: '4px 8px', border: '1px solid #ccc', textAlign: 'right' }}>חסר</th>
            </tr>
          </thead>
          <tbody>
            {deptSoldiers.map(soldier => {
              const sA = soldierAssignments(soldier.id)
              const present = sA.filter(a => checks.get(a.id))
              const missing = sA.filter(a => !checks.get(a.id))
              const allOk = missing.length === 0
              return (
                <tr key={soldier.id} style={{ background: allOk ? '#f0fff4' : '#fff' }}>
                  <td style={{ padding: '4px 8px', border: '1px solid #ddd', fontWeight: 500 }}>
                    {soldier.full_name}
                    {soldier.role_in_unit && <span style={{ color: '#888', fontWeight: 'normal' }}> — {soldier.role_in_unit}</span>}
                  </td>
                  <td style={{ padding: '4px 8px', border: '1px solid #ddd', textAlign: 'center' }}>
                    {allOk ? '✅' : `${present.length}/${sA.length}`}
                  </td>
                  <td style={{ padding: '4px 8px', border: '1px solid #ddd', color: '#2a7a2a', fontSize: 11 }}>
                    {present.length ? present.map(itemLabel).join(', ') : '—'}
                  </td>
                  <td style={{ padding: '4px 8px', border: '1px solid #ddd', color: missing.length ? '#c00' : '#888', fontSize: 11 }}>
                    {missing.length ? missing.map(itemLabel).join(', ') : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
