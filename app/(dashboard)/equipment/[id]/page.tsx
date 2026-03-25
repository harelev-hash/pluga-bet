import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { formatDate, formatDateTime } from '@/lib/utils'
import EquipmentForm from './equipment-form'

interface Props { params: Promise<{ id: string }> }

const CONDITION_LABELS: Record<string, string> = {
  serviceable: 'תקין',
  needs_repair: 'טעון תיקון',
  unserviceable: 'לא תקין',
}

export default async function EquipmentItemPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: types }, { data: item, error }] = await Promise.all([
    supabase.from('equipment_types').select('*').order('category').order('name'),
    supabase
      .from('equipment_items')
      .select('*, type:equipment_types(*)')
      .eq('id', parseInt(id))
      .single(),
  ])

  if (error) notFound()

  const { data: transactions } = await supabase
    .from('equipment_transactions')
    .select('*, soldier:soldiers(id,full_name,rank)')
    .eq('item_id', item.id)
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/equipment" className="text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{(item.type as any)?.name}</h1>
          {(item.type as any)?.is_serialized && (
            <p className="text-slate-500 text-sm font-mono">{item.serial_number}</p>
          )}
        </div>
      </div>

      <EquipmentForm item={item} types={types ?? []} />

      {/* Transaction history */}
      {transactions && transactions.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100">
          <div className="p-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-700">היסטוריה</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {transactions.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <span className="text-sm font-medium text-slate-700">
                    {t.action === 'assign' ? 'הוצאה ל' : t.action === 'return' ? 'החזרה מ' : t.action === 'transfer' ? 'העברה' : t.action}
                    {t.soldier && ` ${(t.soldier as any).full_name}`}
                  </span>
                  {t.notes && <p className="text-xs text-slate-400">{t.notes}</p>}
                </div>
                <span className="text-xs text-slate-400">{formatDateTime(t.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
