'use client'

import { Printer, MessageCircle, Lock, Check, Clock, X } from 'lucide-react'

interface MelmItem {
  id: number
  item_kind: string | null
  quantity_requested: number
  notes: string | null
  free_text: string | null
  resap_status: string | null
  resap_notes: string | null
  resap_performed_at: string | null
  performerName: string | null
  assignment_id: number | null
  soldier: { id: number; full_name: string; rank: string } | null
  type: { id: number; name: string } | null
  assignment: {
    id: number; condition_in: string; attribute: string | null
    item: { serial_number: string | null } | null
  } | null
}

interface Props {
  requestId: number
  title: string
  status: string
  deptName: string | null
  requestDate: string
  submitterName: string | null
  closedByName: string | null
  closedAt: string | null
  items: MelmItem[]
}

const STATUS_LABELS: Record<string, string> = {
  open: 'פתוח', in_progress: 'בטיפול', resolved: 'טופל', closed: 'סגור',
}
const STATUS_COLORS: Record<string, string> = {
  open: 'bg-orange-100 text-orange-700', in_progress: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-green-100 text-green-700', closed: 'bg-slate-100 text-slate-500',
}
const KIND_LABEL: Record<string, string> = {
  wear: 'בלאי לחייל', missing_soldier: 'ציוד חסר לחייל',
  missing_dept: 'ציוד למחלקה', free_text: 'מלל חופשי', equipment: 'ציוד',
}
const KIND_COLORS: Record<string, string> = {
  wear: 'border-r-4 border-r-amber-400', missing_soldier: 'border-r-4 border-r-blue-400',
  missing_dept: 'border-r-4 border-r-emerald-400', free_text: 'border-r-4 border-r-slate-300',
}
const RESAP_CONFIG: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  supplied:  { label: 'סופק',        icon: <Check className="w-3.5 h-3.5" />, cls: 'bg-green-100 text-green-700' },
  long_term: { label: 'טיפול ארוך',  icon: <Clock className="w-3.5 h-3.5" />, cls: 'bg-amber-100 text-amber-700' },
  rejected:  { label: 'דחוי',        icon: <X className="w-3.5 h-3.5" />,     cls: 'bg-red-100 text-red-600' },
  pending:   { label: 'ממתין',       icon: null,                               cls: 'bg-slate-100 text-slate-500' },
}

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

function itemDescription(item: MelmItem): string {
  const kind = item.item_kind ?? 'equipment'
  if (kind === 'free_text') return item.free_text ?? '—'
  if (kind === 'wear' || kind === 'missing_soldier') {
    const soldierPart = item.soldier?.full_name ?? '—'
    const equipPart = item.type?.name ?? item.free_text ?? '—'
    const serial = item.assignment?.item?.serial_number
    return `${soldierPart} — ${equipPart}${serial ? ` #${serial}` : ''}`
  }
  return item.type?.name ?? item.free_text ?? '—'
}

function buildWhatsAppText(props: Props): string {
  const lines: string[] = [
    `מל"מ: ${props.title}`,
    `מחלקה: ${props.deptName ?? '—'} | תאריך: ${formatDate(props.requestDate)}`,
    `סטטוס: ${STATUS_LABELS[props.status] ?? props.status}`,
    props.submitterName ? `הוגש ע"י: ${props.submitterName}` : '',
    props.closedByName ? `נסגר ע"י: ${props.closedByName} (${formatDate(props.closedAt)})` : '',
    '',
  ].filter(l => l !== undefined && !(l === '' && lines?.length === 0))

  props.items.forEach((item, idx) => {
    const kind = item.item_kind ?? 'equipment'
    const resap = RESAP_CONFIG[item.resap_status ?? 'pending'] ?? RESAP_CONFIG.pending
    lines.push(`${idx + 1}. [${KIND_LABEL[kind] ?? kind}] ${itemDescription(item)}`)
    if (item.quantity_requested > 1) lines[lines.length - 1] += ` ×${item.quantity_requested}`
    if (item.notes) lines.push(`   הערת סמל: ${item.notes}`)
    lines.push(`   סטטוס: ${resap.label}${item.performerName ? ` (${item.performerName})` : ''}`)
    if (item.resap_notes) lines.push(`   הערת רספ: ${item.resap_notes}`)
  })

  return lines.join('\n')
}

export default function ViewClient(props: Props) {
  const { title, status, deptName, requestDate, submitterName, closedByName, closedAt, items } = props

  const handlePrint = () => window.print()

  const handleWhatsApp = () => {
    const text = buildWhatsAppText(props)
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  return (
    <>
      {/* Print CSS */}
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm 15mm; }
          .no-print { display: none !important; }
          .print-card { break-inside: avoid; }

          /* Compact header */
          .print-card.header-card { padding: 8px 12px !important; margin-bottom: 6px !important; }
          .print-card.header-card h2 { font-size: 14px !important; margin-bottom: 1px !important; }
          .print-card.header-card p { font-size: 10px !important; margin: 0 !important; }

          /* Compact item cards */
          .print-card { padding: 5px 10px !important; border-radius: 4px !important; box-shadow: none !important; }
          .print-items { gap: 3px !important; display: flex; flex-direction: column; }

          /* Shrink text inside items */
          .print-card .item-kind-label { font-size: 9px !important; }
          .print-card .item-desc { font-size: 11px !important; margin-top: 0 !important; }
          .print-card .item-notes { font-size: 9px !important; margin-top: 1px !important; }
          .print-card .resap-badge { font-size: 9px !important; padding: 1px 6px !important; }
          .print-card .resap-details { margin-top: 3px !important; padding-top: 3px !important; }
          .print-card .resap-details p { font-size: 9px !important; margin: 0 !important; }
        }
      `}</style>

      {/* Action bar */}
      <div className="flex items-center gap-2 no-print">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          <Printer className="w-4 h-4" />
          הורד PDF
        </button>
        <button
          onClick={handleWhatsApp}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          שלח בווטסאפ
        </button>
      </div>

      {/* Request header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 print-card header-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{title}</h2>
            <p className="text-slate-500 text-sm mt-1">
              {deptName && <span>{deptName} · </span>}
              {formatDate(requestDate)}
              {submitterName && <span> · הוגש ע"י {submitterName}</span>}
            </p>
            {closedAt && (
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                נסגר {formatDate(closedAt)}{closedByName ? ` ע"י ${closedByName}` : ''}
              </p>
            )}
          </div>
          <span className={`text-sm px-3 py-1 rounded-full font-medium ${STATUS_COLORS[status] ?? ''}`}>
            {STATUS_LABELS[status] ?? status}
          </span>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-3 print-items">
        {items.map((item, idx) => {
          const kind = item.item_kind ?? 'equipment'
          const resap = RESAP_CONFIG[item.resap_status ?? 'pending'] ?? RESAP_CONFIG.pending

          return (
            <div
              key={item.id}
              className={`bg-white rounded-xl shadow-sm border border-slate-100 p-4 print-card ${KIND_COLORS[kind] ?? ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide item-kind-label">
                    {idx + 1}. {KIND_LABEL[kind] ?? kind}
                  </span>
                  <p className="text-slate-800 font-medium mt-0.5 item-desc">
                    {itemDescription(item)}
                    {item.quantity_requested > 1 && (
                      <span className="text-slate-400 text-sm mr-1"> ×{item.quantity_requested}</span>
                    )}
                  </p>
                  {item.notes && (
                    <p className="text-xs text-slate-400 mt-0.5 item-notes">הערת סמל: {item.notes}</p>
                  )}
                </div>
                <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium shrink-0 resap-badge ${resap.cls}`}>
                  {resap.icon}{resap.label}
                </span>
              </div>

              {/* Resap details */}
              {(item.resap_notes || item.performerName) && (
                <div className="mt-2.5 pt-2.5 border-t border-slate-100 space-y-0.5 resap-details">
                  {item.performerName && item.resap_status !== 'pending' && (
                    <p className="text-xs text-slate-400">
                      טופל ע&quot;י {item.performerName}
                      {item.resap_performed_at && <> · {formatDate(item.resap_performed_at)}</>}
                    </p>
                  )}
                  {item.resap_notes && (
                    <p className="text-xs text-slate-500">הערת רספ: {item.resap_notes}</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {items.length === 0 && (
        <p className="text-center text-slate-400 text-sm py-8">אין סעיפים</p>
      )}
    </>
  )
}
