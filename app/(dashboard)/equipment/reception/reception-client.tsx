'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, Clock, ChevronDown, ChevronUp, Check, User, Pencil } from 'lucide-react'

interface PlannedItem {
  id: number
  quantity: number
  attribute: string | null
  condition_in: string
  notes: string | null
  item_id: number | null
  type_id: number | null
  item?: { id: number; serial_number: string | null; type?: { id: number; name: string } | null } | null
  type?: { id: number; name: string } | null
}

interface SoldierGroup {
  soldier: { id: number; full_name: string; rank: string; role_in_unit: string | null }
  items: PlannedItem[]
}

interface Props {
  soldierGroups: SoldierGroup[]
  activeSoldierIds: number[]
  activeSoldierCount: number
  currentPeriodId: number | null
}

export default function ReceptionClient({ soldierGroups, activeSoldierIds, activeSoldierCount, currentPeriodId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [expanded, setExpanded] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [confirming, setConfirming] = useState<number | null>(null)
  const [received, setReceived] = useState<Set<number>>(new Set(activeSoldierIds))

  const filtered = soldierGroups.filter(g =>
    !search || g.soldier.full_name.includes(search) || g.soldier.role_in_unit?.includes(search)
  )

  const pending = filtered.filter(g => !received.has(g.soldier.id))
  const done = filtered.filter(g => received.has(g.soldier.id))

  const confirmReception = (soldierId: number, itemIds: number[]) => {
    setConfirming(soldierId)
    startTransition(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const now = new Date().toISOString()

      const { error } = await supabase
        .from('equipment_assignments')
        .update({
          status: 'active',
          signed_at: now,
          period_id: currentPeriodId,
          performed_by: user?.id ?? null,
        })
        .in('id', itemIds)

      if (error) {
        alert(`שגיאה: ${error.message}`)
      } else {
        setReceived(prev => new Set([...prev, soldierId]))
        setExpanded(null)
      }
      setConfirming(null)
    })
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Search + stats */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex items-center gap-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="חיפוש חייל..."
          className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <div className="flex items-center gap-4 text-sm shrink-0">
          <span className="flex items-center gap-1.5 text-amber-600 font-medium">
            <Clock className="w-4 h-4" /> {pending.length} ממתינים
          </span>
          <span className="flex items-center gap-1.5 text-green-600 font-medium">
            <CheckCircle2 className="w-4 h-4" /> {activeSoldierCount} נקלטו
          </span>
        </div>
      </div>

      {/* Pending soldiers */}
      {pending.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 px-1">ממתינים לקליטה</p>
          {pending.map(({ soldier, items }) => (
            <SoldierCard
              key={soldier.id}
              soldier={soldier}
              items={items}
              isReceived={false}
              isExpanded={expanded === soldier.id}
              isConfirming={confirming === soldier.id}
              onToggle={() => setExpanded(expanded === soldier.id ? null : soldier.id)}
              onConfirm={() => confirmReception(soldier.id, items.map(i => i.id))}
            />
          ))}
        </div>
      )}

      {/* Received soldiers */}
      {done.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 px-1">נקלטו</p>
          {done.map(({ soldier, items }) => (
            <SoldierCard
              key={soldier.id}
              soldier={soldier}
              items={items}
              isReceived={true}
              isExpanded={expanded === soldier.id}
              isConfirming={false}
              onToggle={() => setExpanded(expanded === soldier.id ? null : soldier.id)}
              onConfirm={() => {}}
            />
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-100 py-12 text-center">
          <User className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">אין חיילים עם ציוד מיועד</p>
          <p className="text-slate-300 text-xs mt-1">ייבא תיקי לוחם קודם</p>
        </div>
      )}
    </div>
  )
}

function SoldierCard({
  soldier, items, isReceived, isExpanded, isConfirming, onToggle, onConfirm,
}: {
  soldier: { id: number; full_name: string; rank: string; role_in_unit: string | null }
  items: PlannedItem[]
  isReceived: boolean
  isExpanded: boolean
  isConfirming: boolean
  onToggle: () => void
  onConfirm: () => void
}) {
  const router = useRouter()
  const [editingAttr, setEditingAttr] = useState<number | null>(null)
  const [attrValue, setAttrValue] = useState('')

  const saveAttr = async (itemId: number) => {
    const supabase = createClient()
    await supabase
      .from('equipment_assignments')
      .update({ attribute: attrValue.trim() || null })
      .eq('id', itemId)
    setEditingAttr(null)
    router.refresh()
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all ${isReceived ? 'border-green-100' : 'border-slate-100'}`}>
      {/* Header */}
      <div
        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${isReceived ? 'hover:bg-green-50/30' : 'hover:bg-slate-50'}`}
        onClick={onToggle}
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isReceived ? 'bg-green-100' : 'bg-slate-100'}`}>
          {isReceived
            ? <CheckCircle2 className="w-4 h-4 text-green-600" />
            : <Clock className="w-4 h-4 text-slate-400" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 text-sm">
            {soldier.full_name}
          </p>
          {soldier.role_in_unit && (
            <p className="text-xs text-slate-400">{soldier.role_in_unit}</p>
          )}
        </div>
        <span className="text-xs text-slate-400 shrink-0">{items.length} פריטים</span>
        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
      </div>

      {/* Expanded: items list + confirm button */}
      {isExpanded && (
        <div className="border-t border-slate-100">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-50">
              {items.map(item => {
                const name = item.item
                  ? `${item.item.type?.name ?? ''}${item.item.serial_number ? ` #${item.item.serial_number}` : ''}`
                  : item.type?.name ?? '—'
                return (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-700 font-medium">{name}</td>
                    <td className="px-4 py-2.5 text-slate-500 text-xs">
                      {editingAttr === item.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            autoFocus
                            value={attrValue}
                            onChange={e => setAttrValue(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveAttr(item.id); if (e.key === 'Escape') setEditingAttr(null) }}
                            placeholder="ערך..."
                            className="border border-blue-300 rounded px-2 py-0.5 text-xs w-24 focus:outline-none focus:ring-1 focus:ring-blue-300"
                          />
                          <button onClick={() => saveAttr(item.id)} className="text-green-600 hover:text-green-800"><Check className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setEditingAttr(null)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingAttr(item.id); setAttrValue(item.attribute ?? '') }}
                          className="flex items-center gap-1 group/attr"
                        >
                          {item.attribute
                            ? <span className="bg-slate-100 px-2 py-0.5 rounded group-hover/attr:bg-blue-100 group-hover/attr:text-blue-700 transition-colors">{item.attribute}</span>
                            : <span className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"><Pencil className="w-3 h-3" /></span>
                          }
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-400 text-xs">
                      {!item.item && item.quantity > 1 && `×${item.quantity}`}
                    </td>
                    <td className="px-4 py-2.5">
                      <ConditionBadge condition={item.condition_in} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {!isReceived && (
            <div className="px-4 py-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={onConfirm}
                disabled={isConfirming}
                className="flex items-center gap-2 bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                <Check className="w-4 h-4" />
                {isConfirming ? 'מאשר...' : `אשר קליטה — ${items.length} פריטים`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ConditionBadge({ condition }: { condition: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    serviceable: { label: 'תקין',  cls: 'bg-green-100 text-green-700' },
    worn:        { label: 'בלאי',  cls: 'bg-yellow-100 text-yellow-700' },
    damaged:     { label: 'פגום',  cls: 'bg-red-100 text-red-700' },
  }
  const c = map[condition] ?? { label: condition, cls: 'bg-slate-100 text-slate-500' }
  return <span className={`text-xs px-2 py-0.5 rounded-full ${c.cls}`}>{c.label}</span>
}
