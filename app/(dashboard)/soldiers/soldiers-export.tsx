'use client'

import { Share2, Printer } from 'lucide-react'

interface Soldier {
  full_name: string
  rank?: string | null
  department?: { name: string } | null
  city?: string | null
  personal_phone?: string | null
  certifications?: string[] | null
}

export default function SoldiersExport({ soldiers, filterLabel }: { soldiers: Soldier[]; filterLabel?: string }) {
  const handleWhatsApp = () => {
    const today = new Date().toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const title = filterLabel ? `📋 דוח כוח אדם — ${filterLabel}` : '📋 דוח כוח אדם — פלוגה ב\''
    const header = `${title}\nתאריך: ${today}\nסה"כ: ${soldiers.length} חיילים\n\n`
    const rows = soldiers.map(s => {
      const parts: string[] = [s.full_name]
      if (s.rank) parts.push(s.rank)
      if (s.department?.name) parts.push(s.department.name)
      if (s.city) parts.push(s.city)
      if (s.personal_phone) parts.push(s.personal_phone)
      if (s.certifications?.length) parts.push(s.certifications.join(', '))
      return parts.join(' | ')
    })
    const text = header + rows.join('\n')
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  return (
    <div className="flex gap-2 print:hidden">
      <button
        onClick={handleWhatsApp}
        className="flex items-center gap-1.5 text-sm text-emerald-700 border border-emerald-200 bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors"
      >
        <Share2 className="w-3.5 h-3.5" />
        שלח בוואטסאפ
      </button>
      <button
        onClick={() => window.print()}
        className="flex items-center gap-1.5 text-sm text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
      >
        <Printer className="w-3.5 h-3.5" />
        הדפסה / PDF
      </button>
    </div>
  )
}
