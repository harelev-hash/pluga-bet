import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/auth/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Edit } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import SoldierForm from '../soldier-form'

interface Props {
  params: Promise<{ id: string }>
}

export default async function SoldierPage({ params }: Props) {
  const { id } = await params
  await requirePermission('nav:soldiers')
  const isNew = id === 'new'
  const supabase = await createClient()

  const [{ data: departments }, { data: certTypes }, { data: qualTypes }, soldierResult] = await Promise.all([
    supabase.from('departments').select('*').order('display_order'),
    supabase.from('certification_types').select('name').eq('is_active', true).order('display_order').order('name'),
    supabase.from('qualification_types').select('name').eq('is_active', true).order('display_order').order('name'),
    isNew
      ? { data: null, error: null }
      : supabase
          .from('soldiers')
          .select('*, department:departments(id,name)')
          .eq('id', parseInt(id))
          .single(),
  ])
  const certificationOptions = (certTypes ?? []).map((c: any) => c.name)
  const qualificationOptions = (qualTypes ?? []).map((q: any) => q.name)

  if (!isNew && soldierResult.error) notFound()
  const soldier = soldierResult.data

  // Equipment & attendance stats for existing soldiers
  let equipmentCount = 0, attendanceDays = 0
  if (!isNew && soldier) {
    const [eqRes, attRes] = await Promise.all([
      supabase.from('soldier_equipment').select('*', { count: 'exact', head: true }).eq('soldier_id', soldier.id).gt('quantity', 0),
      supabase.from('daily_attendance').select('*', { count: 'exact', head: true }).eq('soldier_id', soldier.id).eq('status', 'present'),
    ])
    equipmentCount = eqRes.count ?? 0
    attendanceDays = attRes.count ?? 0
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/soldiers" className="text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {isNew ? 'חייל חדש' : soldier?.full_name}
          </h1>
          {!isNew && soldier && (
            <p className="text-slate-500 text-sm">{soldier.department?.name ?? ''} · {soldier.rank}</p>
          )}
        </div>
      </div>

      {/* Stats for existing soldier */}
      {!isNew && soldier && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 text-center">
            <p className="text-2xl font-bold text-blue-600">{attendanceDays}</p>
            <p className="text-xs text-slate-500 mt-1">ימי נוכחות</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 text-center">
            <p className="text-2xl font-bold text-green-600">{equipmentCount}</p>
            <p className="text-xs text-slate-500 mt-1">פריטי ציוד</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 text-center">
            <p className="text-2xl font-bold text-purple-600">{soldier.certifications?.length ?? 0}</p>
            <p className="text-xs text-slate-500 mt-1">תפקידים בסבב</p>
          </div>
        </div>
      )}

      {/* Form */}
      <SoldierForm
        soldier={soldier}
        departments={departments ?? []}
        isNew={isNew}
        certificationOptions={certificationOptions}
        qualificationOptions={qualificationOptions}
      />
    </div>
  )
}
