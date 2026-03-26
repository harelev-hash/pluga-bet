'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import { Upload, CheckCircle2, AlertCircle, FileSpreadsheet, UserCheck, UserX, Info } from 'lucide-react'

interface Soldier { id: number; full_name: string; id_number: string; rank: string }
interface EquipmentType { id: number; name: string; category: string; is_serialized: boolean; ownership: string }
interface ExistingItem { id: number; type_id: number; serial_number: string | null }

interface Props {
  soldiers: Soldier[]
  types: EquipmentType[]
  existingItems: ExistingItem[]
}

// Map Excel column names → equipment type names in DB
const COL_TO_TYPE: Record<string, { name: string; isSerial?: boolean }> = {
  'תיק לואו':      { name: 'תיק לוחם', isSerial: true },
  'ווסט':           { name: 'ווסט' },
  'קסדה ':          { name: 'קסדה' },
  'קסדה':           { name: 'קסדה' },
  'ברכיות':         { name: 'ברכיות' },
  'שלוקר':          { name: 'שלוקר' },
  'מחסניות':        { name: 'מחסניות' },
  'מצנפת':          { name: 'מצנפת' },
  'שומר אחי':       { name: 'שומר אחי' },
  'רצועה לנשק':     { name: 'רצועה לנשק' },
  'ח.ע':            { name: 'ח"ע' },
  'ת.א':            { name: 'ת"א' },
  'חלפ"ס':          { name: 'חלפ"ס סט' },
}

// Fuzzy name match: normalize and compare
function normalizeName(name: string) {
  return name.replace(/\s+/g, ' ').trim()
}
function matchSoldier(excelName: string, soldiers: Soldier[]): Soldier | null {
  const norm = normalizeName(excelName)
  return soldiers.find(s => normalizeName(s.full_name) === norm) ?? null
}

interface KitRow {
  kitNumber: number
  role: string          // אפיון
  excelName: string
  soldier: Soldier | null
  items: KitItem[]
  // kit already exists in DB?
  kitItemExists: boolean
}

interface KitItem {
  colName: string
  typeName: string
  typeId: number | null
  value: string         // raw value from Excel
  quantity: number
  attribute: string     // e.g. "עמרן" for vest, "ג" for helmet
  include: boolean      // has this item?
  isSerial: boolean
}

export default function ImportKitsForm({ soldiers, types, existingItems }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<KitRow[]>([])
  const [result, setResult] = useState<{ kitsCreated: number; assignmentsCreated: number; skipped: string[] } | null>(null)

  const typeByName = (name: string) => types.find(t => t.name === name) ?? null
  const existingKitSerials = new Set(
    existingItems.filter(i => {
      const t = types.find(tt => tt.id === i.type_id)
      return t?.name === 'תיק לוחם'
    }).map(i => i.serial_number)
  )

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setRows([])
    setResult(null)

    const reader = new FileReader()
    reader.onload = ev => {
      const data = new Uint8Array(ev.target!.result as ArrayBuffer)
      const wb = XLSX.read(data, { type: 'array' })

      // Try to find the right sheet
      const sheetName = wb.SheetNames.find(n => n.includes('תיקי לוחם') || n.includes('לוחם')) ?? wb.SheetNames[0]
      const ws = wb.Sheets[sheetName]
      const json: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: '' })

      const parsed: KitRow[] = json
        .filter(r => r['מספר תיק'] && String(r['מספר תיק']).match(/^\d+$/))
        .map(r => {
          const kitNumber = parseInt(String(r['מספר תיק']))
          const excelName = String(r['שם'] ?? '').trim()
          const soldier = excelName ? matchSoldier(excelName, soldiers) : null

          const items: KitItem[] = Object.entries(COL_TO_TYPE).map(([col, meta]) => {
            const raw = String(r[col] ?? '').trim()
            if (!raw || raw === '-' || raw === '—') {
              return { colName: col, typeName: meta.name, typeId: typeByName(meta.name)?.id ?? null, value: raw, quantity: 0, attribute: '', include: false, isSerial: meta.isSerial ?? false }
            }
            // Parse value
            let quantity = 1
            let attribute = ''
            let include = true

            if (meta.name === 'מחסניות') {
              quantity = parseInt(raw) || 0
              include = quantity > 0
            } else if (meta.name === 'ווסט') {
              // value is the vest type (עמרן, מודולארי etc.) or V
              attribute = raw === 'V' ? '' : raw
              include = true
            } else if (meta.name === 'קסדה') {
              // value is size (ג, מ, ב, ר) or V
              attribute = raw === 'V' ? '' : raw
              include = true
            } else {
              // V = yes, anything else = note/variant
              attribute = raw === 'V' ? '' : raw
              include = true
            }

            return {
              colName: col,
              typeName: meta.name,
              typeId: typeByName(meta.name)?.id ?? null,
              value: raw,
              quantity,
              attribute,
              include,
              isSerial: meta.isSerial ?? false,
            }
          }).filter(i => i.include)

          return {
            kitNumber,
            role: String(r['אפיון'] ?? '').trim(),
            excelName,
            soldier,
            items,
            kitItemExists: existingKitSerials.has(String(kitNumber)),
          }
        })

      setRows(parsed)
    }
    reader.readAsArrayBuffer(file)
  }

  const matchedCount = rows.filter(r => r.soldier).length
  const unmatchedCount = rows.filter(r => r.excelName && !r.soldier).length
  const noNameCount = rows.filter(r => !r.excelName).length
  const newKitsCount = rows.filter(r => !r.kitItemExists).length

  const handleImport = () => {
    startTransition(async () => {
      const supabase = createClient()
      const skipped: string[] = []
      let kitsCreated = 0
      let assignmentsCreated = 0

      const kitType = types.find(t => t.name === 'תיק לוחם')
      if (!kitType) { alert('לא נמצא סוג ציוד "תיק לוחם" — צור אותו קודם בניהול ציוד'); return }

      for (const row of rows) {
        // 1. Create equipment_item for the kit (if not exists)
        let kitItemId: number | null = null
        if (!row.kitItemExists) {
          const { data, error } = await supabase
            .from('equipment_items')
            .insert({ type_id: kitType.id, serial_number: String(row.kitNumber), quantity: 1, condition: 'serviceable' })
            .select('id')
            .single()
          if (error) { skipped.push(`תיק ${row.kitNumber}: ${error.message}`); continue }
          kitItemId = data.id
          kitsCreated++
        } else {
          // Get existing item id
          const existing = existingItems.find(i => i.type_id === kitType.id && i.serial_number === String(row.kitNumber))
          kitItemId = existing?.id ?? null
        }

        // 2. Create planned assignments (only if soldier is known)
        if (!row.soldier) {
          if (row.excelName) skipped.push(`${row.excelName} (תיק ${row.kitNumber}): לא נמצא במערכת — תיק נוצר ללא שיוך`)
          continue
        }

        const soldierId = row.soldier.id

        // Check for existing planned assignments for this soldier+kit
        const { data: existing } = await supabase
          .from('equipment_assignments')
          .select('id')
          .eq('soldier_id', soldierId)
          .eq('status', 'planned')
          .eq('item_id', kitItemId)

        if (existing && existing.length > 0) {
          skipped.push(`${row.soldier.full_name} (תיק ${row.kitNumber}): כבר קיים שיוך — דולג`)
          continue
        }

        // Create assignment for the kit itself
        if (kitItemId) {
          const { error } = await supabase.from('equipment_assignments').insert({
            soldier_id: soldierId,
            item_id: kitItemId,
            quantity: 1,
            status: 'planned',
            condition_in: 'serviceable',
          })
          if (!error) assignmentsCreated++
        }

        // Create assignments for other items in the kit
        for (const item of row.items) {
          if (item.isSerial) continue // kit itself handled above
          if (!item.typeId) { skipped.push(`${row.soldier.full_name}: סוג ציוד "${item.typeName}" לא נמצא`); continue }

          const { error } = await supabase.from('equipment_assignments').insert({
            soldier_id: soldierId,
            type_id: item.typeId,
            quantity: item.quantity || 1,
            attribute: item.attribute || null,
            status: 'planned',
            condition_in: 'serviceable',
          })
          if (!error) assignmentsCreated++
          else skipped.push(`${row.soldier.full_name} — ${item.typeName}: ${error.message}`)
        }
      }

      setResult({ kitsCreated, assignmentsCreated, skipped })
      router.refresh()
    })
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Info */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700 space-y-1">
        <p className="font-semibold flex items-center gap-2"><Info className="w-4 h-4" /> מה הייבוא הזה עושה</p>
        <p>קורא את גיליון "תיקי לוחם" → יוצר 81 תיקים כפריטים מסודרים → מייצר שיוך מיועד (<span className="font-mono">planned</span>) לכל חייל על הציוד שלו</p>
        <p className="text-blue-500 text-xs">חיילים שלא נמצאו במערכת — התיק ייווצר ללא שיוך, תוכל לקשר אותו אחר כך</p>
      </div>

      {/* Upload */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <label className="flex flex-col items-center gap-3 cursor-pointer py-8 border-2 border-dashed border-slate-200 rounded-xl hover:border-blue-400 transition-colors">
          <FileSpreadsheet className="w-10 h-10 text-slate-300" />
          <span className="text-sm font-medium text-slate-600">{fileName || 'בחר קובץ — שיוך תיקי לוחם ורשמצ ציוד פלוגתי.xlsx'}</span>
          <span className="text-xs text-slate-400">.xlsx, .xls</span>
          <input type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
        </label>
      </div>

      {/* Summary */}
      {rows.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-slate-800">{rows.length}</p>
              <p className="text-xs text-slate-500 mt-1">תיקים בקובץ</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{newKitsCount}</p>
              <p className="text-xs text-slate-500 mt-1">תיקים חדשים ייווצרו</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{matchedCount}</p>
              <p className="text-xs text-slate-500 mt-1">חיילים שזוהו</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-amber-500">{unmatchedCount}</p>
              <p className="text-xs text-slate-500 mt-1">חיילים לא זוהו</p>
            </div>
          </div>

          {/* Preview table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <span className="font-semibold text-slate-700">תצוגה מקדימה</span>
              <button
                onClick={handleImport}
                disabled={isPending}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                <Upload className="w-4 h-4" />
                {isPending ? 'מייבא...' : 'ייבא עכשיו'}
              </button>
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-right font-medium text-slate-500">תיק</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500">אפיון</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500">שם באקסל</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500">חייל במערכת</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500">פריטים</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rows.map(row => (
                    <tr key={row.kitNumber} className={row.kitItemExists ? 'bg-slate-50/50' : ''}>
                      <td className="px-3 py-2 font-mono text-slate-600 font-bold">{row.kitNumber}</td>
                      <td className="px-3 py-2 text-slate-500 text-xs">{row.role || '—'}</td>
                      <td className="px-3 py-2 text-slate-700">{row.excelName || <span className="text-slate-300 text-xs">ריק</span>}</td>
                      <td className="px-3 py-2">
                        {row.soldier ? (
                          <span className="flex items-center gap-1 text-green-700 text-xs font-medium">
                            <UserCheck className="w-3.5 h-3.5" />
                            {row.soldier.rank} {row.soldier.full_name}
                          </span>
                        ) : row.excelName ? (
                          <span className="flex items-center gap-1 text-amber-600 text-xs">
                            <UserX className="w-3.5 h-3.5" /> לא נמצא
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-400">
                        {row.items.length} פריטים
                        {row.kitItemExists && <span className="mr-2 text-slate-300">(תיק קיים)</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-3">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-1 text-sm text-green-700">
            <p className="font-semibold flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> ייבוא הושלם</p>
            <p>נוצרו {result.kitsCreated} תיקי לוחם חדשים</p>
            <p>נוצרו {result.assignmentsCreated} שיוכים מיועדים (planned)</p>
          </div>
          {result.skipped.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1 text-sm">
              <p className="font-semibold text-amber-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {result.skipped.length} הערות:
              </p>
              {result.skipped.map((s, i) => <p key={i} className="text-amber-700 text-xs">{s}</p>)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
