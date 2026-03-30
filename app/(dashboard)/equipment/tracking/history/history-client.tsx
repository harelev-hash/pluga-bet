'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChevronDown, ChevronUp, Trash2, Printer, MessageCircle } from 'lucide-react'

interface TrackingCheck {
  id: number
  is_present: boolean
  assignment_id: number
  snapshot_soldier_name: string | null
  snapshot_storage_name: string | null
  assignment: {
    id: number; attribute: string | null; quantity: number
    item: { serial_number: string | null; type: { name: string } | null } | null
    type: { name: string } | null
  } | null
}

interface Report {
  id: number
  report_date: string
  created_at: string
  template_ids: number[]
  performer: { full_name: string } | null
  checks: TrackingCheck[]
}

interface Props { reports: Report[]; templateMap: Record<number, string> }

const formatDate = (d: string) =>
  new Date(d + 'T12:00:00').toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })

const getTypeName = (c: TrackingCheck) =>
  c.assignment?.item?.type?.name ?? c.assignment?.type?.name ?? '—'

const getDetail = (c: TrackingCheck) => {
  const parts: string[] = []
  if (c.assignment?.item?.serial_number) parts.push(`#${c.assignment.item.serial_number}`)
  if (c.assignment?.attribute) parts.push(`(${c.assignment.attribute})`)
  if (!c.assignment?.item && (c.assignment?.quantity ?? 1) > 1) parts.push(`×${c.assignment!.quantity}`)
  return parts.join(' ')
}

const getStorage = (c: TrackingCheck) => c.snapshot_storage_name ?? null
const getSoldier = (c: TrackingCheck) => c.snapshot_soldier_name ?? null

function printReport(report: Report, templateMap: Record<number, string>) {
  const date = formatDate(report.report_date)
  const templateNames = report.template_ids.length > 0
    ? report.template_ids.map(id => templateMap[id] ?? `#${id}`).join(', ')
    : 'כל הציוד'
  const present = report.checks.filter(c => c.is_present)
  const missing = report.checks.filter(c => !c.is_present)

  const rows = report.checks.map(c => {
    const typeName = getTypeName(c)
    const detail = getDetail(c)
    const soldier = getSoldier(c) ?? '—'
    const storage = getStorage(c) ?? '—'
    return `<tr style="background:${c.is_present ? '#f0fff4' : '#fff'}">
      <td style="padding:4px 8px;border:1px solid #ddd;font-weight:500">${typeName}</td>
      <td style="padding:4px 8px;border:1px solid #ddd;font-family:monospace;font-size:11px">${detail || '—'}</td>
      <td style="padding:4px 8px;border:1px solid #ddd;font-size:11px">${soldier}</td>
      <td style="padding:4px 8px;border:1px solid #ddd;font-size:11px">${storage}</td>
      <td style="padding:4px 8px;border:1px solid #ddd;text-align:center">${c.is_present ? '✅' : '⬜'}</td>
    </tr>`
  }).join('')

  const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8">
    <style>@page{size:A4;margin:15mm} body{font-family:Arial,sans-serif;font-size:13px} table{width:100%;border-collapse:collapse} tr{page-break-inside:avoid}</style>
    </head><body>
    <div style="border-bottom:2px solid #222;padding-bottom:6px;margin-bottom:12px">
      <h2 style="font-size:18px;font-weight:bold;margin:0">מעקב ציוד יומי — ${date}</h2>
      <p style="font-size:11px;color:#666;margin:3px 0 0">ציוד: ${templateNames} · סה"כ: ${present.length}/${report.checks.length} פריטים</p>
    </div>
    <table><thead><tr style="background:#f0f0f0">
      <th style="padding:4px 8px;border:1px solid #ccc;text-align:right">סוג ציוד</th>
      <th style="padding:4px 8px;border:1px solid #ccc;text-align:right">מ"ס / פרטים</th>
      <th style="padding:4px 8px;border:1px solid #ccc;text-align:right">חייל</th>
      <th style="padding:4px 8px;border:1px solid #ccc;text-align:right">מקום אפסון</th>
      <th style="padding:4px 8px;border:1px solid #ccc;text-align:center;width:40px">קיים</th>
    </tr></thead><tbody>${rows}</tbody></table>
    <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500)}</script>
    </body></html>`

  const w = window.open('', '_blank')
  if (w) { w.document.write(html); w.document.close() }
}

function whatsappReport(report: Report, templateMap: Record<number, string>) {
  const date = formatDate(report.report_date)
  const templateNames = report.template_ids.length > 0
    ? report.template_ids.map(id => templateMap[id] ?? `#${id}`).join(', ')
    : 'כל הציוד'

  // Group by type name
  const byType = new Map<string, TrackingCheck[]>()
  report.checks.forEach(c => {
    const name = getTypeName(c)
    if (!byType.has(name)) byType.set(name, [])
    byType.get(name)!.push(c)
  })

  let text = `מעקב ציוד יומי — ${date}\nציוד: ${templateNames}\n\n`
  byType.forEach((checks, typeName) => {
    const present = checks.filter(c => c.is_present)
    const missing = checks.filter(c => !c.is_present)
    text += `${missing.length === 0 ? '✅' : '⚠️'} ${typeName} — ${present.length}/${checks.length}\n`
    missing.forEach(c => {
      const detail = getDetail(c)
      const soldier = getSoldier(c)
      text += `  חסר: ${detail || ''}${soldier ? ` (${soldier})` : ''}\n`
    })
  })
  text += `\nסה"כ: ${report.checks.filter(c => c.is_present).length}/${report.checks.length}`
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
}

export default function TrackingHistory({ reports: initialReports, templateMap }: Props) {
  const [isPending, startTransition] = useTransition()
  const [reports, setReports] = useState(initialReports)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [filterDate, setFilterDate] = useState('')

  const toggle = (id: number) =>
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const filtered = filterDate ? reports.filter(r => r.report_date === filterDate) : reports

  const deleteReport = (id: number) => {
    if (!confirm('למחוק את הדוח הזה?')) return
    startTransition(async () => {
      const supabase = createClient()
      await supabase.from('equipment_tracking_reports').delete().eq('id', id)
      setReports(prev => prev.filter(r => r.id !== id))
    })
  }

  const toggleCheck = (reportId: number, checkId: number, current: boolean) => {
    startTransition(async () => {
      const supabase = createClient()
      await supabase.from('equipment_tracking_checks').update({ is_present: !current }).eq('id', checkId)
      setReports(prev => prev.map(r => {
        if (r.id !== reportId) return r
        return { ...r, checks: r.checks.map(c => c.id === checkId ? { ...c, is_present: !current } : c) }
      }))
    })
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex items-center gap-3">
        <input
          type="date"
          value={filterDate}
          onChange={e => setFilterDate(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
        />
        {filterDate && (
          <button onClick={() => setFilterDate('')} className="text-xs text-slate-400 hover:text-slate-600">נקה</button>
        )}
        <span className="text-xs text-slate-400 mr-auto">{filtered.length} דוחות</span>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 py-16 text-center">
          <p className="text-slate-400 text-sm">לא נמצאו דוחות</p>
        </div>
      ) : (
        filtered.map(report => {
          const presentCount = report.checks.filter(c => c.is_present).length
          const allOk = presentCount === report.checks.length && report.checks.length > 0
          const isOpen = expanded.has(report.id)
          const templateNames = report.template_ids.length > 0
            ? report.template_ids.map(id => templateMap[id] ?? `#${id}`).join(', ')
            : 'כל הציוד'

          return (
            <div key={report.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3">
                <button onClick={() => toggle(report.id)} className="flex items-center gap-3 flex-1 text-right min-w-0">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${allOk ? 'bg-amber-500' : 'bg-red-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm">{formatDate(report.report_date)}</p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      {templateNames} · {presentCount}/{report.checks.length} פריטים
                      {!allOk && <span className="text-red-500"> · {report.checks.length - presentCount} חסרים</span>}
                      {report.performer && <span className="text-slate-300"> · {report.performer.full_name}</span>}
                    </p>
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                </button>

                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => whatsappReport(report, templateMap)} title="שלח בווטסאפ" className="p-1.5 text-slate-400 hover:text-[#25D366] transition-colors">
                    <MessageCircle className="w-4 h-4" />
                  </button>
                  <button onClick={() => printReport(report, templateMap)} title="הדפס PDF" className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors">
                    <Printer className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteReport(report.id)} disabled={isPending} title="מחק דוח" className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-slate-100">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-slate-400">סוג ציוד</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-slate-400">מ"ס / פרטים</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-slate-400">חייל</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-slate-400">מקום אפסון</th>
                        <th className="px-4 py-2 text-center text-xs font-semibold text-slate-400 w-14">קיים</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {report.checks.map(c => {
                        const storage = getStorage(c)
                        return (
                          <tr key={c.id} className={c.is_present ? 'bg-amber-50/30' : ''}>
                            <td className="px-4 py-2 font-medium text-slate-800 text-xs">{getTypeName(c)}</td>
                            <td className="px-4 py-2 text-xs font-mono text-slate-500">{getDetail(c) || '—'}</td>
                            <td className="px-4 py-2 text-xs text-slate-700">{getSoldier(c) ?? '—'}</td>
                            <td className="px-4 py-2 text-xs text-slate-500">{getStorage(c) ?? '—'}</td>
                            <td className="px-4 py-2 text-center">
                              <button
                                onClick={() => toggleCheck(report.id, c.id, c.is_present)}
                                disabled={isPending}
                                title={c.is_present ? 'סמן כחסר' : 'סמן כקיים'}
                                className={`text-xs font-medium transition-colors ${c.is_present ? 'text-amber-600 hover:text-red-500' : 'text-slate-300 hover:text-amber-500'}`}
                              >
                                {c.is_present ? '✓' : '✗'}
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  <p className="px-4 py-2 text-xs text-slate-400 border-t border-slate-50">לחץ על ✓/✗ כדי לשנות את הסטטוס</p>
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
