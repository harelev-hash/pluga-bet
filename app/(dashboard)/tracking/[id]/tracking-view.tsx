'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Check, X, Clock, Copy, MessageCircle, ChevronUp, ChevronDown } from 'lucide-react'

type Status = 'pending' | 'done' | 'exempt'

interface Entry {
  id: number
  soldier_id: number
  status: Status
  soldier: { id: number; full_name: string; rank: string; id_number: string } | null
}

interface Event {
  id: number
  name: string
  event_date: string
  description: string | null
}

interface Props {
  event: Event
  entries: Entry[]
}

const NEXT: Record<Status, Status> = { pending: 'done', done: 'exempt', exempt: 'pending' }

type Filter = 'all' | Status

export default function TrackingView({ event, entries: initial }: Props) {
  const [overrides, setOverrides] = useState<Map<number, Status>>(new Map())
  const [busy, setBusy] = useState<Set<number>>(new Set())
  const [filter, setFilter] = useState<Filter>('all')
  const [sortByStatus, setSortByStatus] = useState(false)
  const [copied, setCopied] = useState(false)

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

    if (error) {
      setOverrides(prev => new Map(prev).set(entry.id, current))
    }
    setBusy(prev => { const s = new Set(prev); s.delete(entry.id); return s })
  }

  const all = initial.map(e => ({ ...e, current: getStatus(e) }))
  const done = all.filter(e => e.current === 'done')
  const exempt = all.filter(e => e.current === 'exempt')
  const pending = all.filter(e => e.current === 'pending')
  const relevant = all.length - exempt.length
  const pct = relevant > 0 ? Math.round((done.length / relevant) * 100) : 0

  let displayed = filter === 'all' ? all
    : filter === 'done' ? done
    : filter === 'exempt' ? exempt
    : pending

  if (sortByStatus) {
    const order: Record<Status, number> = { done: 0, pending: 1, exempt: 2 }
    displayed = [...displayed].sort((a, b) => order[a.current] - order[b.current])
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const buildMessage = () => [
    `✅ מעקב: ${event.name}`,
    `📅 תאריך: ${formatDate(event.event_date)}`,
    ``,
    `👥 ביצעו (${done.length} מתוך ${relevant}):`,
    ``,
    ...done.map(e => `• ${e.soldier?.rank ?? ''} ${e.soldier?.full_name ?? '—'} | ${e.soldier?.id_number ?? ''}`),
    ...(exempt.length > 0 ? [
      ``, `⛔ לא רלוונטי (${exempt.length}):`, ``,
      ...exempt.map(e => `• ${e.soldier?.rank ?? ''} ${e.soldier?.full_name ?? '—'}`),
    ] : []),
  ].join('\n')

  const handleCopy = async () => {
    await navigator.clipboard.writeText(buildMessage())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleWhatsApp = () => {
    const text = buildMessage().slice(0, 2000)
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Progress */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 space-y-3">
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
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
          <div
            className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 text-center">
          {done.length} ביצעו · {pending.length} ממתינים · {exempt.length} לא רלוונטי
        </p>
      </div>

      {/* Filter + sort */}
      <div className="flex flex-wrap items-center gap-2">
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
                : key === 'exempt' ? 'bg-red-500 text-white'
                : key === 'pending' ? 'bg-amber-500 text-white'
                : 'bg-blue-600 text-white'
                : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => setSortByStatus(v => !v)}
          className={`mr-auto px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            sortByStatus ? 'bg-slate-700 text-white border-slate-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
          }`}
        >
          {sortByStatus ? <ChevronUp className="w-3 h-3 inline ml-1" /> : <ChevronDown className="w-3 h-3 inline ml-1" />}
          מיין לפי סטטוס
        </button>
      </div>

      {/* Tap hint */}
      <p className="text-xs text-slate-400 px-1">
        לחץ על חייל לסימון: <span className="text-amber-500 font-medium">ממתין</span> → <span className="text-green-600 font-medium">ביצע</span> → <span className="text-red-500 font-medium">לא רלוונטי</span> → ממתין
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
                relative rounded-xl p-3 text-right transition-all active:scale-95 border select-none
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
                  status === 'done'   ? 'bg-green-500 text-white'
                  : status === 'exempt' ? 'bg-red-400 text-white'
                  : 'bg-slate-200 text-slate-400'
                }`}>
                  {status === 'done'   ? <Check className="w-3.5 h-3.5" />
                   : status === 'exempt' ? <X className="w-3.5 h-3.5" />
                   : <Clock className="w-3.5 h-3.5" />}
                </span>
              </div>
              <p className={`text-xs font-semibold leading-tight ${
                status === 'done'   ? 'text-green-800'
                : status === 'exempt' ? 'text-red-700'
                : 'text-slate-700'
              }`}>
                {entry.soldier?.rank} {entry.soldier?.full_name ?? '—'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">{entry.soldier?.id_number}</p>
            </button>
          )
        })}
      </div>

      {displayed.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-100 py-10 text-center text-slate-400 text-sm">
          אין חיילים בקטגוריה זו
        </div>
      )}

      {/* Export */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 space-y-3">
        <p className="text-xs font-semibold text-slate-500">ייצוא דוח</p>
        <div className="flex flex-wrap gap-3 items-center">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Copy className="w-4 h-4" />
            {copied ? '✓ הועתק' : 'העתק ללוח'}
          </button>
          <button
            onClick={handleWhatsApp}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            שלח לווטסאפ
          </button>
          <span className="text-xs text-slate-400">(מוגבל ל-2,000 תווים)</span>
        </div>
        {/* Preview */}
        <details className="text-xs text-slate-400">
          <summary className="cursor-pointer hover:text-slate-600">תצוגה מקדימה של ההודעה</summary>
          <pre className="mt-2 p-3 bg-slate-50 rounded-lg whitespace-pre-wrap text-slate-600 text-xs leading-relaxed max-h-48 overflow-y-auto">
            {buildMessage()}
          </pre>
        </details>
      </div>
    </div>
  )
}
