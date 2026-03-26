'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Department } from '@/lib/types/database'
import { Upload, CheckCircle2, AlertCircle, FileSpreadsheet, Info, TriangleAlert } from 'lucide-react'
import * as XLSX from 'xlsx'

interface Props { departments: Department[] }

interface ParsedRow {
  full_name: string
  id_number: string
  rank: string
  department_name: string
  role_in_unit: string
  personal_phone: string
  emergency_contact: string
  home_address: string
  city: string
  notes: string
  // validation
  warnings: string[]
  isDuplicate: boolean
}

interface ParseResult {
  rows: ParsedRow[]
  detectedColumns: string[]
  columnMapping: Record<string, string>
  skipped: { row: number; reason: string }[]
}

const COLUMN_MAP: Record<string, string> = {
  'שם מלא': 'full_name',
  'full_name': 'full_name',
  'מ"א': 'id_number',
  'מ״א': 'id_number',
  'מספר חייל': 'id_number',
  'מס\' אישי': 'id_number',
  'מס אישי': 'id_number',
  'ת.ז': 'id_number',
  'id_number': 'id_number',
  'דרגה': 'rank',
  'rank': 'rank',
  'מחלקה': 'department_name',
  'department': 'department_name',
  'תפקיד': 'role_in_unit',
  'role_in_unit': 'role_in_unit',
  'טלפון': 'personal_phone',
  'personal_phone': 'personal_phone',
  'איש קשר': 'emergency_contact',
  'emergency_contact': 'emergency_contact',
  'כתובת': 'home_address',
  'home_address': 'home_address',
  'עיר': 'city',
  'city': 'city',
  'הערות': 'notes',
  'notes': 'notes',
}

function normalizeId(val: unknown): string {
  return String(val ?? '').replace(/[^\w\d]/g, '').trim()
}

function parseExcel(data: Uint8Array, departments: Department[]): ParseResult {
  const wb = XLSX.read(data, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const json: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: '' })

  if (json.length === 0) {
    return { rows: [], detectedColumns: [], columnMapping: {}, skipped: [] }
  }

  const detectedColumns = Object.keys(json[0])
  const columnMapping: Record<string, string> = {}
  for (const col of detectedColumns) {
    const mapped = COLUMN_MAP[col.trim()]
    if (mapped) columnMapping[col] = mapped
  }

  const deptNames = new Set(departments.map(d => d.name))
  const idsSeen = new Map<string, number>() // id_number → first row index
  const skipped: { row: number; reason: string }[] = []
  const rows: ParsedRow[] = []

  json.forEach((r, i) => {
    const get = (field: string): string => {
      for (const [col, mapped] of Object.entries(columnMapping)) {
        if (mapped === field) return String(r[col] ?? '').trim()
      }
      return ''
    }

    const full_name = get('full_name')
    const id_number = normalizeId(get('id_number') || Object.values(r).find(v => /^\d{6,9}$/.test(String(v).trim())) || '')

    if (!full_name && !id_number) {
      skipped.push({ row: i + 2, reason: 'שורה ריקה' })
      return
    }
    if (!full_name) {
      skipped.push({ row: i + 2, reason: `מ"א ${id_number} — חסר שם מלא` })
      return
    }
    if (!id_number) {
      skipped.push({ row: i + 2, reason: `${full_name} — חסר מ"א` })
      return
    }

    const department_name = get('department_name')
    const warnings: string[] = []

    if (department_name && !deptNames.has(department_name)) {
      warnings.push(`מחלקה "${department_name}" לא קיימת במערכת — תישמר ללא שיוך מחלקה`)
    }
    if (!/^\d+$/.test(id_number)) {
      warnings.push(`מ"א "${id_number}" מכיל תווים שאינם ספרות`)
    }

    const isDuplicate = idsSeen.has(id_number)
    if (isDuplicate) {
      const firstRow = idsSeen.get(id_number)!
      warnings.push(`מ"א כפול — מופיע גם בשורה ${firstRow + 2}. השורה הזו תדרוס את הקודמת`)
    } else {
      idsSeen.set(id_number, i)
    }

    rows.push({
      full_name,
      id_number,
      rank: get('rank') || 'טוראי',
      department_name,
      role_in_unit: get('role_in_unit'),
      personal_phone: get('personal_phone'),
      emergency_contact: get('emergency_contact'),
      home_address: get('home_address'),
      city: get('city'),
      notes: get('notes'),
      warnings,
      isDuplicate,
    })
  })

  return { rows, detectedColumns, columnMapping, skipped }
}

interface ImportResult {
  succeeded: number
  failed: { name: string; id: string; error: string }[]
}

const CHUNK_SIZE = 30

export default function SoldiersImport({ departments }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [fileName, setFileName] = useState('')
  const [parsed, setParsed] = useState<ParseResult | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setParsed(null)
    setImportResult(null)
    setProgress(null)

    const reader = new FileReader()
    reader.onload = ev => {
      const data = new Uint8Array(ev.target!.result as ArrayBuffer)
      setParsed(parseExcel(data, departments))
    }
    reader.readAsArrayBuffer(file)
  }

  const handleImport = () => {
    if (!parsed || parsed.rows.length === 0) return
    setImportResult(null)

    startTransition(async () => {
      const supabase = createClient()
      const deptMap: Record<string, number> = {}
      departments.forEach(d => { deptMap[d.name] = d.id })

      // Deduplicate: keep last occurrence per id_number
      const seen = new Map<string, ParsedRow>()
      for (const r of parsed.rows) seen.set(r.id_number, r)
      const unique = Array.from(seen.values())

      const payload = unique.map(r => ({
        full_name: r.full_name,
        id_number: r.id_number,
        rank: r.rank || 'טוראי',
        department_id: r.department_name ? (deptMap[r.department_name] ?? null) : null,
        role_in_unit: r.role_in_unit || null,
        personal_phone: r.personal_phone || null,
        emergency_contact: r.emergency_contact || null,
        home_address: r.home_address || null,
        city: r.city || null,
        notes: r.notes || null,
        is_active: true,
        certifications: [],
      }))

      // Send in chunks to avoid DB conflicts and get granular errors
      const failed: ImportResult['failed'] = []
      let succeeded = 0
      setProgress({ done: 0, total: payload.length })

      for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
        const chunk = payload.slice(i, i + CHUNK_SIZE)
        const { error, data } = await supabase
          .from('soldiers')
          .upsert(chunk, { onConflict: 'id_number', ignoreDuplicates: false })
          .select('id_number, full_name')

        if (error) {
          // Chunk failed — try row by row to identify the culprit
          for (const row of chunk) {
            const { error: rowErr } = await supabase
              .from('soldiers')
              .upsert(row, { onConflict: 'id_number', ignoreDuplicates: false })
            if (rowErr) {
              failed.push({ name: row.full_name, id: row.id_number, error: rowErr.message })
            } else {
              succeeded++
            }
          }
        } else {
          succeeded += data?.length ?? chunk.length
        }

        setProgress({ done: Math.min(i + CHUNK_SIZE, payload.length), total: payload.length })
      }

      setProgress(null)
      setImportResult({ succeeded, failed })
      if (failed.length === 0) {
        setParsed(null)
        router.refresh()
      }
    })
  }

  const rows = parsed?.rows ?? []
  const warningRows = rows.filter(r => r.warnings.length > 0)
  const missingDeptRows = rows.filter(r => r.department_name && !departments.find(d => d.name === r.department_name))
  const unmappedColumns = parsed?.detectedColumns.filter(c => !parsed.columnMapping[c]) ?? []

  return (
    <div className="space-y-4" dir="rtl">
      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700 space-y-1">
        <p className="font-semibold">פורמט נדרש:</p>
        <p>עמודות: <span className="font-mono">שם מלא, מ"א, דרגה, מחלקה, תפקיד, טלפון, איש קשר, כתובת, עיר, הערות</span></p>
        <p className="text-xs text-blue-500">שמות מחלקה חייבים להתאים: {departments.map(d => d.name).join(', ')}</p>
      </div>

      {/* Upload */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <label className="flex flex-col items-center gap-3 cursor-pointer py-8 border-2 border-dashed border-slate-200 rounded-xl hover:border-blue-400 transition-colors">
          <FileSpreadsheet className="w-10 h-10 text-slate-300" />
          <span className="text-sm font-medium text-slate-600">{fileName || 'לחץ לבחירת קובץ Excel'}</span>
          <span className="text-xs text-slate-400">.xlsx, .xls, .csv</span>
          <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
        </label>
      </div>

      {/* Column detection report */}
      {parsed && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 space-y-3 text-sm">
          <p className="font-semibold text-slate-700 flex items-center gap-2"><Info className="w-4 h-4 text-blue-500" /> זיהוי עמודות</p>
          <div className="grid grid-cols-2 gap-2">
            {parsed.detectedColumns.map(col => {
              const mapped = parsed.columnMapping[col]
              return (
                <div key={col} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${mapped ? 'bg-green-50 text-green-700' : 'bg-slate-50 text-slate-400'}`}>
                  {mapped ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <span className="w-3.5 h-3.5 shrink-0 text-center">—</span>}
                  <span className="font-mono">{col}</span>
                  {mapped && <span className="text-green-500">→ {mapped}</span>}
                </div>
              )
            })}
          </div>
          {unmappedColumns.length > 0 && (
            <p className="text-xs text-slate-400">עמודות לא מזוהות (יתעלמו): {unmappedColumns.join(', ')}</p>
          )}
        </div>
      )}

      {/* Skipped rows */}
      {parsed && parsed.skipped.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1.5 text-sm">
          <p className="font-semibold text-amber-800 flex items-center gap-2">
            <TriangleAlert className="w-4 h-4" /> {parsed.skipped.length} שורות הושמטו
          </p>
          {parsed.skipped.map((s, i) => (
            <p key={i} className="text-amber-700 text-xs">שורה {s.row}: {s.reason}</p>
          ))}
        </div>
      )}

      {/* Missing departments */}
      {missingDeptRows.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1.5 text-sm">
          <p className="font-semibold text-amber-800 flex items-center gap-2">
            <TriangleAlert className="w-4 h-4" /> {missingDeptRows.length} חיילים עם מחלקה לא מזוהה — יישמרו ללא שיוך
          </p>
          {missingDeptRows.slice(0, 5).map((r, i) => (
            <p key={i} className="text-amber-700 text-xs">{r.full_name} — &quot;{r.department_name}&quot;</p>
          ))}
          {missingDeptRows.length > 5 && <p className="text-amber-600 text-xs">ועוד {missingDeptRows.length - 5}...</p>}
        </div>
      )}

      {/* Preview table */}
      {rows.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <div>
              <span className="font-semibold text-slate-700">{rows.length} חיילים מוכנים לייבוא</span>
              {warningRows.length > 0 && (
                <span className="mr-2 text-xs text-amber-600">({warningRows.length} עם אזהרות)</span>
              )}
            </div>
            <button
              onClick={handleImport}
              disabled={isPending}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <Upload className="w-4 h-4" />
              {isPending ? (progress ? `מייבא... ${progress.done}/${progress.total}` : 'מייבא...') : 'ייבא עכשיו'}
            </button>
          </div>
          <div className="overflow-x-auto max-h-72">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-right font-medium text-slate-500">שם מלא</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-500">מ"א</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-500">דרגה</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-500">מחלקה</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-500">אזהרות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map((r, i) => (
                  <tr key={i} className={r.isDuplicate ? 'bg-amber-50' : r.warnings.length > 0 ? 'bg-yellow-50/40' : ''}>
                    <td className="px-3 py-2 text-slate-700">{r.full_name}</td>
                    <td className="px-3 py-2 text-slate-500 font-mono">{r.id_number}</td>
                    <td className="px-3 py-2 text-slate-500">{r.rank}</td>
                    <td className={`px-3 py-2 ${!r.department_name ? 'text-slate-300' : missingDeptRows.includes(r) ? 'text-amber-600' : 'text-slate-500'}`}>
                      {r.department_name || '—'}
                    </td>
                    <td className="px-3 py-2">
                      {r.warnings.map((w, wi) => (
                        <span key={wi} className="block text-xs text-amber-600">{w}</span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Import results */}
      {importResult && (
        <div className="space-y-3">
          {importResult.succeeded > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-2 text-sm text-green-700">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              יובאו {importResult.succeeded} חיילים בהצלחה!
            </div>
          )}
          {importResult.failed.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2 text-sm">
              <p className="font-semibold text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {importResult.failed.length} שורות נכשלו:
              </p>
              {importResult.failed.map((f, i) => (
                <div key={i} className="text-red-600 text-xs bg-red-100/50 rounded px-3 py-2">
                  <span className="font-medium">{f.name}</span> (מ"א: {f.id}) — {f.error}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {parsed && rows.length === 0 && parsed.skipped.length === 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-2 text-sm text-red-700">
          <AlertCircle className="w-4 h-4" /> לא נמצאו שורות תקינות בקובץ. בדוק שעמודות שם מלא ומ"א קיימות.
        </div>
      )}
    </div>
  )
}
