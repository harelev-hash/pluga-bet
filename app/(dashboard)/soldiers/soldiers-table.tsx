'use client'

import Link from 'next/link'
import type { Soldier } from '@/lib/types/database'
import { ChevronLeft, Phone } from 'lucide-react'

interface Props {
  soldiers: (Soldier & { department?: { id: number; name: string } | null })[]
}

const RANK_COLORS: Record<string, string> = {
  'טוראי': 'bg-slate-100 text-slate-600',
  'רב טוראי': 'bg-slate-100 text-slate-700',
  'סמל': 'bg-blue-100 text-blue-700',
  'סמל ראשון': 'bg-blue-100 text-blue-700',
  'רב סמל': 'bg-blue-100 text-blue-800',
  'רב סמל מתקדם': 'bg-indigo-100 text-indigo-700',
  'רב סמל בכיר': 'bg-indigo-100 text-indigo-800',
  'סגן': 'bg-yellow-100 text-yellow-700',
  'סרן': 'bg-yellow-100 text-yellow-800',
  'רב סרן': 'bg-orange-100 text-orange-700',
}

export default function SoldiersTable({ soldiers }: Props) {
  if (soldiers.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 py-16 text-center">
        <p className="text-slate-400">לא נמצאו חיילים</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Mobile list */}
      <div className="lg:hidden divide-y divide-slate-100">
        {soldiers.map((s) => (
          <Link key={s.id} href={`/soldiers/${s.id}`} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-slate-800">{s.full_name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${RANK_COLORS[s.rank] ?? 'bg-slate-100 text-slate-600'}`}>
                  {s.rank}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>{s.department?.name ?? '—'}</span>
                {s.role_in_unit && <span>· {s.role_in_unit}</span>}
                {s.personal_phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {s.personal_phone}
                  </span>
                )}
              </div>
            </div>
            <ChevronLeft className="w-4 h-4 text-slate-300 shrink-0" />
          </Link>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">שם</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">מ"א / ת"ז</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">דרגה</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">מחלקה</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">תפקיד</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">טלפון</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">הסמכות</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {soldiers.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <span className="font-medium text-slate-800">{s.full_name}</span>
                  {!s.is_active && <span className="mr-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">לא פעיל</span>}
                </td>
                <td className="px-4 py-3 text-sm text-slate-500 font-mono">{s.id_number}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${RANK_COLORS[s.rank] ?? 'bg-slate-100 text-slate-600'}`}>
                    {s.rank}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">{s.department?.name ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-slate-500">{s.role_in_unit ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-slate-500 font-mono dir-ltr text-right">{s.personal_phone ?? '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {s.certifications?.slice(0, 3).map(c => (
                      <span key={c} className="text-xs bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">{c}</span>
                    ))}
                    {(s.certifications?.length ?? 0) > 3 && (
                      <span className="text-xs text-slate-400">+{s.certifications.length - 3}</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/soldiers/${s.id}`}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    פרטים
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
