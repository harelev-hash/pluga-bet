'use client'

import { useState, useMemo, useTransition } from 'react'
import { ChevronDown, ChevronUp, Filter, Trash2, Printer, MessageCircle, Pencil, Check, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Check {
  id: number
  is_present: boolean
  soldier_id: number
  soldier: { full_name: string; role_in_unit: string | null } | null
  assignment: {
    id: number; attribute: string | null
    item: { serial_number: string | null; type: { name: string } | null } | null
    type: { name: string } | null
  } | null
}

interface Report {
  id: number
  report_date: string
  created_at: string
  department: { id: number; name: string } | null
  template: { id: number; name: string } | null
  performer: { full_name: string } | null
  checks: Check[]
}

interface Department { id: number; name: string }
interface Props { reports: Report[]; departments: Department[] }

const itemLabel = (c: Check) => {
  const name = c.assignment?.item?.type?.name ?? c.assignment?.type?.name ?? '—'
  const serial = c.assignment?.item?.serial_number ? ` #${c.assignment.item.serial_number}` : ''
  const attr = c.assignment?.attribute ? ` (${c.assignment.attribute})` : ''
  return `${name}${serial}${attr}`
}

const formatDate = (d: string) =>
  new Date(d + 'T12:00:00').toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })

function bySoldier(checks: Check[]) {
  const map = new Map<number, { name: string; role: string | null; checks: Check[] }>()
  checks.forEach(c => {
    if (!map.has(c.soldier_id))
      map.set(c.soldier_id, { name: c.soldier?.full_name ?? '—', role: c.soldier?.role_in_unit ?? null, checks: [] })
    map.get(c.soldier_id)!.checks.push(c)
  })
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'he'))
}

function printReport(report: Report) {
  const soldiers = bySoldier(report.checks)
  const totalItems = report.checks.length
  const presentItems = report.checks.filter(c => c.is_present).length
  const date = formatDate(report.report_date)

  const rows = soldiers.map(s => {
    const present = s.checks.filter(c => c.is_present)
    const missing = s.checks.filter(c => !c.is_present)
    const allOk = missing.length === 0
    return `<tr style="background:${allOk ? '#f0fff4' : '#fff'}">
      <td style="padding:4px 8px;border:1px solid #ddd;font-weight:500">${s.name}${s.role ? ` <span style="color:#888;font-weight:normal">— ${s.role}</span>` : ''}</td>
      <td style="padding:4px 8px;border:1px solid #ddd;text-align:center">${allOk ? '✅' : `${present.length}/${s.checks.length}`}</td>
      <td style="padding:4px 8px;border:1px solid #ddd;color:#2a7a2a;font-size:11px">${present.map(itemLabel).join(', ') || '—'}</td>
      <td style="padding:4px 8px;border:1px solid #ddd;color:${missing.length ? '#c00' : '#888'};font-size:11px">${missing.map(itemLabel).join(', ') || '—'}</td>
    </tr>`
  }).join('')

  const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8">
    <style>@page{size:A4;margin:15mm} body{font-family:Arial,sans-serif;font-size:13px} table{width:100%;border-collapse:collapse} tr{page-break-inside:avoid}</style>
    </head><body>
    <div style="border-bottom:2px solid #222;padding-bottom:6px;margin-bottom:12px">
      <h2 style="font-size:18px;font-weight:bold;margin:0">ירוק בעיניים — ${report.department?.name ?? ''} — ${date}</h2>
      <p style="font-size:11px;color:#666;margin:3px 0 0">${report.template ? `תבנית: ${report.template.name} · ` : ''}סה"כ: ${presentItems}/${totalItems} פריטים · ${soldiers.filter(s => s.checks.every(c => c.is_present)).length}/${soldiers.length} חיילים תקינים</p>
    </div>
    <table><thead><tr style="background:#f0f0f0">
      <th style="padding:4px 8px;border:1px solid #ccc;text-align:right">חייל</th>
      <th style="padding:4px 8px;border:1px solid #ccc;text-align:center;width:60px">סטטוס</th>
      <th style="padding:4px 8px;border:1px solid #ccc;text-align:right">קיים</th>
      <th style="padding:4px 8px;border:1px solid #ccc;text-align:right">חסר</th>
    </tr></thead><tbody>${rows}</tbody></table>
    <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500)}</script>
    </body></html>`

  const w = window.open('', '_blank')
  if (w) { w.document.write(html); w.document.close() }
}

function whatsappReport(report: Report) {
  const soldiers = bySoldier(report.checks)
  const totalItems = report.checks.length
  const presentItems = report.checks.filter(c => c.is_present).length
  const date = formatDate(report.report_date)

  let text = `ירוק בעיניים — ${report.department?.name ?? ''} — ${date}\n`
  if (report.template) text += `תבנית: ${report.template.name}\n`
  text += '\n'
  soldiers.forEach(s => {
    const present = s.checks.filter(c => c.is_present)
    const missing = s.checks.filter(c => !c.is_present)
    text += `${missing.length === 0 ? '✅' : '⚠️'} ${s.name} — ${present.length}/${s.checks.length}\n`
    if (missing.length) text += `  חסר: ${missing.map(itemLabel).join(', ')}\n`
  })
  text += `\nסה"כ: ${presentItems}/${totalItems}`
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
}

export default function GreenEyesHistory({ reports: initialReports, departments }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [reports, setReports] = useState(initialReports)
  const [filterDept, setFilterDept] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [editing, setEditing] = useState<Set<number>>(new Set()) // check ids being toggled

  const toggle = (id: number) =>
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const filtered = useMemo(() => reports.filter(r => {
    if (filterDept && String(r.department?.id) !== filterDept) return false
    if (filterDate && r.report_date !== filterDate) return false
    return true
  }), [reports, filterDept, filterDate])

  const deleteReport = (reportId: number) => {
    if (!confirm('למחוק את הדוח הזה?')) return
    startTransition(async () => {
      const supabase = createClient()
      await supabase.from('green_eyes_reports').delete().eq('id', reportId)
      setReports(prev => prev.filter(r => r.id !== reportId))
    })
  }

  const toggleCheck = (reportId: number, checkId: number, current: boolean) => {
    startTransition(async () => {
      const supabase = createClient()
      await supabase.from('green_eyes_checks').update({ is_present: !current }).eq('id', checkId)
      setReports(prev => prev.map(r => {
        if (r.id !== reportId) return r
        return { ...r, checks: r.checks.map(c => c.id === checkId ? { ...c, is_present: !current } : c) }
      }))
    })
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={filterDept}
            onChange={e => setFilterDept(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
          >
            <option value="">כל המחלקות</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <input
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
          />
          {(filterDept || filterDate) && (
            <button onClick={() => { setFilterDept(''); setFilterDate('') }} className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 transition-colors">נקה</button>
          )}
          <span className="text-xs text-slate-400 mr-auto">{filtered.length} דוחות</span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 py-16 text-center">
          <p className="text-slate-400 text-sm">לא נמצאו דוחות</p>
        </div>
      ) : (
        filtered.map(report => {
          const soldiers = bySoldier(report.checks)
          const totalItems = report.checks.length
          const presentItems = report.checks.filter(c => c.is_present).length
          const allOk = soldiers.every(s => s.checks.every(c => c.is_present))
          const isOpen = expanded.has(report.id)

          return (
            <div key={report.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-2 px-4 py-3">
                <button onClick={() => toggle(report.id)} className="flex items-center gap-3 flex-1 text-right min-w-0">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${allOk ? 'bg-green-500' : 'bg-amber-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm">
                      {formatDate(report.report_date)}
                      {report.department && <span className="text-slate-500 font-normal mr-2">— {report.department.name}</span>}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {report.template ? `תבנית: ${report.template.name} · ` : ''}
                      {soldiers.length} חיילים · {presentItems}/{totalItems} פריטים
                      {!allOk && <span className="text-amber-500"> · {soldiers.filter(s => s.checks.some(c => !c.is_present)).length} לא תקינים</span>}
                      {report.performer && <span className="text-slate-300"> · {report.performer.full_name}</span>}
                    </p>
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                </button>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => whatsappReport(report)}
                    title="שלח בווטסאפ"
                    className="p-1.5 text-slate-400 hover:text-[#25D366] transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => printReport(report)}
                    title="הדפס PDF"
                    className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteReport(report.id)}
                    disabled={isPending}
                    title="מחק דוח"
                    className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Expanded detail */}
              {isOpen && (
                <div className="border-t border-slate-100">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-slate-400">חייל</th>
                        <th className="px-4 py-2 text-center text-xs font-semibold text-slate-400 w-14">סטטוס</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-slate-400">קיים</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-slate-400">חסר</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {soldiers.map((s, i) => {
                        const present = s.checks.filter(c => c.is_present)
                        const missing = s.checks.filter(c => !c.is_present)
                        return (
                          <tr key={i} className={missing.length === 0 ? 'bg-green-50/40' : ''}>
                            <td className="px-4 py-2.5 font-medium text-slate-800">
                              {s.name}
                              {s.role && <span className="text-slate-400 font-normal text-xs mr-1">— {s.role}</span>}
                            </td>
                            <td className="px-4 py-2.5 text-center text-xs">
                              {missing.length === 0
                                ? <span className="text-green-600 font-medium">✓</span>
                                : <span className="text-amber-600 font-medium">{present.length}/{s.checks.length}</span>}
                            </td>
                            <td className="px-4 py-2.5 text-xs text-green-700">
                              {present.map(c => (
                                <button
                                  key={c.id}
                                  onClick={() => toggleCheck(report.id, c.id, true)}
                                  disabled={isPending}
                                  title="סמן כחסר"
                                  className="inline-flex items-center gap-0.5 mr-1 hover:line-through hover:text-red-500 transition-colors disabled:opacity-50"
                                >
                                  {itemLabel(c)}
                                </button>
                              ))}
                              {present.length === 0 && '—'}
                            </td>
                            <td className="px-4 py-2.5 text-xs text-red-600">
                              {missing.map(c => (
                                <button
                                  key={c.id}
                                  onClick={() => toggleCheck(report.id, c.id, false)}
                                  disabled={isPending}
                                  title="סמן כקיים"
                                  className="inline-flex items-center gap-0.5 mr-1 hover:line-through hover:text-green-600 transition-colors disabled:opacity-50"
                                >
                                  {itemLabel(c)}
                                </button>
                              ))}
                              {missing.length === 0 && '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  <p className="px-4 py-2 text-xs text-slate-400 border-t border-slate-50">לחץ על פריט כדי לשנות את סטטוסו</p>
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
