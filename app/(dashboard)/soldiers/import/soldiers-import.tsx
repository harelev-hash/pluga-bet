'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Department } from '@/lib/types/database'
import { Upload, CheckCircle2, AlertCircle, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'

interface Props { departments: Department[] }

interface Row {
  full_name: string
  id_number: string
  rank?: string
  department_name?: string
  role_in_unit?: string
  personal_phone?: string
  emergency_contact?: string
  home_address?: string
  city?: string
  notes?: string
}

export default function SoldiersImport({ departments }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [rows, setRows] = useState<Row[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [success, setSuccess] = useState(0)
  const [fileName, setFileName] = useState('')

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setErrors([])
    setSuccess(0)

    const reader = new FileReader()
    reader.onload = ev => {
      const data = new Uint8Array(ev.target!.result as ArrayBuffer)
      const wb = XLSX.read(data, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const json: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' })

      const parsed: Row[] = json.map(r => ({
        full_name: String(r['שם מלא'] ?? r['full_name'] ?? '').trim(),
        id_number: String(r['מ"א'] ?? r['מספר חייל'] ?? r['ת.ז'] ?? r['id_number'] ?? '').trim(),
        rank: String(r['דרגה'] ?? r['rank'] ?? 'טוראי').trim() || 'טוראי',
        department_name: String(r['מחלקה'] ?? r['department'] ?? '').trim(),
        role_in_unit: String(r['תפקיד'] ?? r['role_in_unit'] ?? '').trim(),
        personal_phone: String(r['טלפון'] ?? r['personal_phone'] ?? '').trim(),
        emergency_contact: String(r['איש קשר'] ?? r['emergency_contact'] ?? '').trim(),
        home_address: String(r['כתובת'] ?? r['home_address'] ?? '').trim(),
        city: String(r['עיר'] ?? r['city'] ?? '').trim(),
        notes: String(r['הערות'] ?? r['notes'] ?? '').trim(),
      }))

      const valid = parsed.filter(r => r.full_name && r.id_number)
      const invalid = parsed.length - valid.length
      if (invalid > 0) setErrors([`${invalid} שורות ללא שם מלא או מ"א — הושמטו`])
      setRows(valid)
    }
    reader.readAsArrayBuffer(file)
  }

  const handleImport = () => {
    if (rows.length === 0) return
    setErrors([])
    setSuccess(0)

    startTransition(async () => {
      const supabase = createClient()
      const deptMap: Record<string, number> = {}
      departments.forEach(d => { deptMap[d.name] = d.id })

      const payload = rows.map(r => ({
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

      const { error, data } = await supabase
        .from('soldiers')
        .upsert(payload, { onConflict: 'id_number', ignoreDuplicates: false })
        .select()

      if (error) {
        setErrors([error.message])
      } else {
        setSuccess(data?.length ?? rows.length)
        setRows([])
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700 space-y-1">
        <p className="font-semibold">פורמט נדרש:</p>
        <p>עמודות: <span className="font-mono">שם מלא, מ"א, דרגה, מחלקה, תפקיד, טלפון, איש קשר, כתובת, עיר, הערות</span></p>
        <p className="text-xs text-blue-500">שמות מחלקה חייבים להתאים לשמות במערכת: {departments.map(d => d.name).join(', ')}</p>
      </div>

      {/* Upload */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <label className="flex flex-col items-center gap-3 cursor-pointer py-8 border-2 border-dashed border-slate-200 rounded-xl hover:border-blue-400 transition-colors">
          <FileSpreadsheet className="w-10 h-10 text-slate-300" />
          <span className="text-sm font-medium text-slate-600">
            {fileName || 'לחץ לבחירת קובץ Excel'}
          </span>
          <span className="text-xs text-slate-400">.xlsx, .xls, .csv</span>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFile}
            className="hidden"
          />
        </label>
      </div>

      {/* Preview */}
      {rows.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <span className="font-semibold text-slate-700">{rows.length} שורות מוכנות לייבוא</span>
            <button
              onClick={handleImport}
              disabled={isPending}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <Upload className="w-4 h-4" />
              {isPending ? 'מייבא...' : 'ייבא עכשיו'}
            </button>
          </div>
          <div className="overflow-x-auto max-h-64">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-right font-medium text-slate-500">שם מלא</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-500">מ"א</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-500">דרגה</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-500">מחלקה</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-500">תפקיד</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-slate-700">{r.full_name}</td>
                    <td className="px-3 py-2 text-slate-500 font-mono">{r.id_number}</td>
                    <td className="px-3 py-2 text-slate-500">{r.rank}</td>
                    <td className="px-3 py-2 text-slate-500">{r.department_name || '—'}</td>
                    <td className="px-3 py-2 text-slate-500">{r.role_in_unit || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Results */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-1">
          {errors.map((e, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />{e}
            </div>
          ))}
        </div>
      )}
      {success > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-2 text-sm text-green-700">
          <CheckCircle2 className="w-5 h-5" />
          יובאו {success} חיילים בהצלחה!
        </div>
      )}
    </div>
  )
}
