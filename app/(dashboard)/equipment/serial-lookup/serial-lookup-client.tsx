'use client'

import { useState, useMemo } from 'react'
import { Search, History, ChevronDown, ChevronUp } from 'lucide-react'

interface HistoryEntry {
  id: number
  status: string
  attribute: string | null
  signed_at: string | null
  returned_at: string | null
  notes: string | null
  soldier: { full_name: string; rank: string } | null
  performer?: { full_name: string } | null
}

interface Item {
  id: number
  serial_number: string
  condition: string
  type: { id: number; name: string; category: string } | null
  assignment: {
    status: string
    attribute: string | null
    soldier: { full_name: string; rank: string } | null
  } | null
  history: HistoryEntry[]
}

interface Props {
  items: Item[]
}

const CONDITION_LABELS: Record<string, { label: string; cls: string }> = {
  serviceable: { label: 'תקין',  cls: 'bg-green-100 text-green-700' },
  worn:        { label: 'בלאי',  cls: 'bg-yellow-100 text-yellow-700' },
  damaged:     { label: 'פגום',  cls: 'bg-red-100 text-red-700' },
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  active:      { label: 'חתום',   cls: 'bg-blue-100 text-blue-700' },
  planned:     { label: 'מיועד',  cls: 'bg-amber-100 text-amber-700' },
  returned:    { label: 'הוחזר',  cls: 'bg-slate-100 text-slate-500' },
  transferred: { label: 'הועבר',  cls: 'bg-purple-100 text-purple-500' },
  lost:        { label: 'אבד',    cls: 'bg-red-100 text-red-500' },
  free:        { label: 'פנוי',   cls: 'bg-slate-100 text-slate-500' },
}

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

export default function SerialLookupClient({ items }: Props) {
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [expandedHistory, setExpandedHistory] = useState<Set<number>>(new Set())

  const toggleHistory = (id: number) =>
    setExpandedHistory(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const categories = useMemo(() => {
    const cats = new Set(items.map(i => i.type?.category ?? 'אחר'))
    return Array.from(cats).sort()
  }, [items])

  const filtered = useMemo(() => {
    return items.filter(item => {
      const matchesQuery = !query.trim() ||
        item.serial_number.toLowerCase().includes(query.trim().toLowerCase()) ||
        (item.type?.name ?? '').includes(query.trim()) ||
        (item.assignment?.soldier?.full_name ?? '').includes(query.trim())
      const matchesCat = !selectedCategory || (item.type?.category ?? 'אחר') === selectedCategory
      return matchesQuery && matchesCat
    })
  }, [items, query, selectedCategory])

  const grouped = useMemo(() => {
    const map: Record<string, Item[]> = {}
    for (const item of filtered) {
      const cat = item.type?.category ?? 'אחר'
      ;(map[cat] = map[cat] ?? []).push(item)
    }
    return map
  }, [filtered])

  const itemLocation = (item: Item): { label: string; cls: string } => {
    if (!item.assignment) return STATUS_LABELS.free
    return STATUS_LABELS[item.assignment.status] ?? { label: item.assignment.status, cls: 'bg-slate-100 text-slate-500' }
  }

  const highlight = (text: string) => {
    if (!query.trim() || !text.toLowerCase().includes(query.trim().toLowerCase())) return text
    return <mark className="bg-yellow-100 rounded">{text}</mark>
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Search + category filter */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 space-y-3">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="חפש לפי מספר סידורי, שם ציוד, חייל..."
            className="w-full pr-10 pl-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            autoFocus
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${!selectedCategory ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            הכל ({items.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedCategory === cat ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {cat} ({items.filter(i => (i.type?.category ?? 'אחר') === cat).length})
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 py-16 text-center">
          <Search className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">לא נמצאו פריטים</p>
        </div>
      ) : (
        Object.entries(grouped).map(([cat, catItems]) => (
          <div key={cat} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
              <span className="text-xs font-semibold text-slate-500">{cat}</span>
              <span className="text-xs text-slate-400 mr-2">({catItems.length} פריטים)</span>
            </div>
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100">
                <tr>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-slate-400">מ״ס</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-slate-400">סוג</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-slate-400">מצב</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-slate-400">מיקום</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-slate-400">סטטוס</th>
                  <th className="px-4 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {catItems.map(item => {
                  const loc = itemLocation(item)
                  const cond = CONDITION_LABELS[item.condition] ?? { label: item.condition, cls: 'bg-slate-100 text-slate-500' }
                  const historyOpen = expandedHistory.has(item.id)
                  return (
                    <>
                      <tr key={item.id} className="hover:bg-slate-50 border-b border-slate-50">
                        <td className="px-4 py-2.5 font-mono text-slate-800 font-medium">
                          {highlight(item.serial_number)}
                        </td>
                        <td className="px-4 py-2.5 text-slate-700">{item.type?.name ?? '—'}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${cond.cls}`}>{cond.label}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          {item.assignment?.soldier ? (
                            <span className="text-slate-700">
                              {item.assignment.soldier.full_name}
                              {item.assignment.attribute && (
                                <span className="text-slate-400 text-xs mr-1">({item.assignment.attribute})</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">פנוי במחסן</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${loc.cls}`}>{loc.label}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          {item.history.length > 0 && (
                            <button
                              onClick={() => toggleHistory(item.id)}
                              title={`היסטוריה (${item.history.length})`}
                              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${historyOpen ? 'bg-slate-200 text-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                            >
                              <History className="w-3.5 h-3.5" />
                              <span>{item.history.length}</span>
                              {historyOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* History rows */}
                      {historyOpen && item.history.map(h => (
                        <tr key={`h-${h.id}`} className="bg-slate-50/80 border-b border-slate-50 opacity-80 text-xs">
                          <td className="px-4 py-2 text-slate-400 font-mono pl-8">↳</td>
                          <td className="px-4 py-2 text-slate-500" colSpan={2}>
                            {h.soldier?.full_name ?? '—'}
                            {h.attribute && <span className="text-slate-400 mr-1">({h.attribute})</span>}
                          </td>
                          <td className="px-4 py-2 text-slate-400">
                            {formatDate(h.signed_at)}
                            {h.returned_at && <> → {formatDate(h.returned_at)}</>}
                          </td>
                          <td className="px-4 py-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_LABELS[h.status]?.cls ?? ''}`}>
                              {STATUS_LABELS[h.status]?.label ?? h.status}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-400">
                            {h.performer && <span className="text-slate-300 ml-1">({h.performer.full_name})</span>}
                            {h.notes ?? ''}
                          </td>
                        </tr>
                      ))}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  )
}
