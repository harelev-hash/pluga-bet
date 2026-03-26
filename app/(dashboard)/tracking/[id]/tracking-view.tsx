'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Check, X, Clock, Copy, MessageCircle, Search, Pencil, ChevronDown, ChevronUp } from 'lucide-react'

type Status = 'pending' | 'done' | 'exempt'
type Filter = 'all' | Status

interface Entry {
  id: number
  soldier_id: number
  status: Status
  soldier: { id: number; full_name: string; rank: string; id_number: string; department_id: number | null } | null
}

interface Event {
  id: number
  name: string
  event_date: string
  description: string | null
  type: string | null
}

interface Department { id: number; name: string }

interface Props {
  event: Event
  entries: Entry[]
  departments: Department[]
}

const NEXT: Record<Status, Status> = { pending: 'done', done: 'exempt', exempt: 'pending' }

export default function TrackingView({ event, entries: initial, departments }: Props) {
  const router = useRouter()
  const [overrides, setOverrides] = useState<Map<number, Status>>(new Map())
  const [busy, setBusy] = useState<Set<number>>(new Set())
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ name: event.name, description: event.description ?? '', event_date: event.event_date, type: event.type ?? '' })
  const [isSaving, startSave] = useTransition()

  const saveEdit = () => {
    startSave(async () => {
      const supabase = createClient()
      await supabase.from('tracking_events').update({
        name: editForm.name.trim(),
        description: editForm.description.trim() || null,
        event_date: editForm.event_date,
        type: editForm.type.trim() || null,
      }).eq('id', event.id)
      setEditOpen(false)
      router.refresh()
    })
  }

  const getStatus = (e: Entry): Status => overrides.get(e.id) ?? e.status

  const tap = async (entry: Entry) => {
    if (busy.has(entry.id)) return
    const current = getStatus(entry)
    const next = NEXT[current]
    setOverrides(prev => new Map(prev).set(entry.id, next))
    setBusy(prev => new Set(prev).add(entry.id))
    const supabase = createClient()
    const { error } = await supabase
      .from('tracking_entries')
      .update({ status: next, marked_at: next !== 'pending' ? new Date().toISOString() : null })
      .eq('id', entry.id)
    if (error) setOverrides(prev => new Map(prev).set(entry.id, current))
    setBusy(prev => { const s = new Set(prev); s.delete(entry.id); return s })
  }

  const all = initial.map(e => ({ ...e, current: getStatus(e) }))
  const done    = all.filter(e => e.current === 'done')
  const exempt  = all.filter(e => e.current === 'exempt')
  const pending = all.filter(e => e.current === 'pending')
  const relevant = all.length - exempt.length
  const pct = relevant > 0 ? Math.round((done.length / relevant) * 100) : 0

  // Apply all filters
  let displayed = filter === 'all' ? all
    : filter === 'done' ? done
    : filter === 'exempt' ? exempt
    : pending

  if (search.trim()) {
    const q = search.trim()
    displayed = displayed.filter(e =>
      e.soldier?.full_name.includes(q) ||
      e.soldier?.rank.includes(q) ||
      e.soldier?.id_number.includes(q)
    )
  }

  if (deptFilter !== null) {
    displayed = displayed.filter(e => e.soldier?.department_id === deptFilter)
  }

  // Sort: done first, then pending, then exempt
  displayed = [...displayed].sort((a, b) => {
    const order: Record<Status, number> = { done: 0, pending: 1, exempt: 2 }
    return order[a.current] - order[b.current]
  })

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const buildMessage = () => [
    `✅ מעקב: ${event.name}`,
    `📅 תאריך: ${formatDate(event.event_date)}`,
    ``,
    `👥 ביצעו (${done.length} מתוך ${relevant}):`,
    ``,
    ...done.map(e => `• ${e.soldier?.full_name ?? '—'} | ${e.soldier?.id_number ?? ''}`),
    ...(exempt.length > 0 ? [
      ``, `⛔ לא רלוונטי (${exempt.length}):`, ``,
      ...exempt.map(e => `• ${e.soldier?.full_name ?? '—'}`),
    ] : []),
  ].join('\n')

  const handleCopy = async () => {
    await navigator.clipboard.writeText(buildMessage())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(buildMessage().slice(0, 2000))}`, '_blank')
  }

  return (
    <div className="space-y-4" dir="rtl">

      {/* Edit panel */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <button
          onClick={() => setEditOpen(v => !v)}
          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors text-sm"
        >
          <span className="flex items-center gap-2 text-slate-500">
            <Pencil className="w-3.5 h-3.5" />
            ערוך פרטי מעקב
          </span>
          {editOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>
        {editOpen && (
          <div className="border-t border-slate-100 p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-medium text-slate-600 mb-1">שם המעקב</label>
                <input
                  value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">סוג מעקב</label>
                <input
                  value={editForm.type}
                  onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))}
                  placeholder='למשל: ביקורת, הגעה, חיסון...'
                  className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">תאריך</label>
                <input
                  type="date"
                  value={editForm.event_date}
                  onChange={e => setEditForm(f => ({ ...f, event_date: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">תיאור</label>
                <input
                  value={editForm.description}
                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="פרטים נוספים..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditOpen(false)} className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700">ביטול</button>
              <button
                onClick={saveEdit}
                disabled={isSaving || !editForm.name.trim()}
                className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isSaving ? 'שומר...' : 'שמור'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Progress + Export — TOP */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 space-y-3">
        {/* Progress */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-slate-800">{done.length}</span>
            <span className="text-slate-400">/ {relevant} ביצעו</span>
            {exempt.length > 0 && (
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{exempt.length} לא רלוונטי</span>
            )}
          </div>
          <span className="text-lg font-bold text-blue-600">{pct}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <div
            className="h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 text-center">
          {done.length} ביצעו · {pending.length} ממתינים · {exempt.length} לא רלוונטי
        </p>

        {/* Export buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            {copied ? '✓ הועתק' : 'העתק ללוח'}
          </button>
          <button
            onClick={handleWhatsApp}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            שלח לווטסאפ
          </button>
          <span className="text-xs text-slate-300">(מוגבל ל-2,000 תווים)</span>

          {/* Preview */}
          <details className="w-full text-xs text-slate-400 mt-1">
            <summary className="cursor-pointer hover:text-slate-600">תצוגה מקדימה של ההודעה</summary>
            <pre className="mt-2 p-3 bg-slate-50 rounded-lg whitespace-pre-wrap text-slate-600 leading-relaxed max-h-40 overflow-y-auto">
              {buildMessage()}
            </pre>
          </details>
        </div>
      </div>

      {/* Search + dept filter + status tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-3 space-y-3">
        {/* Search + dept */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="חיפוש שם / מ.א..."
              className="w-full border border-slate-200 rounded-lg pr-8 pl-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
          {departments.length > 0 && (
            <select
              value={deptFilter ?? ''}
              onChange={e => setDeptFilter(e.target.value ? parseInt(e.target.value) : null)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="">כל המחלקות</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          )}
        </div>

        {/* Status tabs */}
        <div className="flex flex-wrap gap-2">
          {([
            { key: 'all',     label: `הכל (${all.length})` },
            { key: 'pending', label: `ממתין (${pending.length})` },
            { key: 'done',    label: `ביצע (${done.length})` },
            { key: 'exempt',  label: `לא רלוונטי (${exempt.length})` },
          ] as { key: Filter; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === key
                  ? key === 'done'    ? 'bg-green-600 text-white'
                  : key === 'exempt'  ? 'bg-red-500 text-white'
                  : key === 'pending' ? 'bg-amber-500 text-white'
                  : 'bg-blue-600 text-white'
                  : 'bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Hint */}
      <p className="text-xs text-slate-400 px-1">
        לחץ: <span className="text-amber-500 font-medium">ממתין</span> → <span className="text-green-600 font-medium">ביצע</span> → <span className="text-red-500 font-medium">לא רלוונטי</span> → ממתין
      </p>

      {/* Soldier grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {displayed.map(entry => {
          const status = entry.current
          const isBusy = busy.has(entry.id)
          return (
            <button
              key={entry.id}
              onClick={() => tap(entry)}
              disabled={isBusy}
              className={`
                rounded-xl p-3 text-right transition-all active:scale-95 border select-none
                ${status === 'done'
                  ? 'bg-green-50 border-green-200 hover:bg-green-100'
                  : status === 'exempt'
                  ? 'bg-red-50 border-red-200 hover:bg-red-100'
                  : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50/30'}
                ${isBusy ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
              `}
            >
              <div className="flex items-start justify-between gap-1 mb-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                  status === 'done'    ? 'bg-green-500 text-white'
                  : status === 'exempt' ? 'bg-red-400 text-white'
                  : 'bg-slate-200 text-slate-400'
                }`}>
                  {status === 'done'    ? <Check className="w-3.5 h-3.5" />
                   : status === 'exempt' ? <X className="w-3.5 h-3.5" />
                   : <Clock className="w-3.5 h-3.5" />}
                </span>
              </div>
              <p className={`text-xs font-semibold leading-tight ${
                status === 'done'    ? 'text-green-800'
                : status === 'exempt' ? 'text-red-700'
                : 'text-slate-700'
              }`}>
                {entry.soldier?.full_name ?? '—'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">{entry.soldier?.id_number}</p>
            </button>
          )
        })}
      </div>

      {displayed.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-100 py-10 text-center text-slate-400 text-sm">
          {search || deptFilter ? 'לא נמצאו חיילים לפי החיפוש' : 'אין חיילים בקטגוריה זו'}
        </div>
      )}

    </div>
  )
}
