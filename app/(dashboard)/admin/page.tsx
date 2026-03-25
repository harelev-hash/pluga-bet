import { createClient } from '@/lib/supabase/server'
import AdminUsers from './admin-users'
import AdminPeriod from './admin-period'

export default async function AdminPage() {
  const supabase = await createClient()

  const [{ data: users }, { data: periods }, { data: departments }] = await Promise.all([
    supabase.from('app_users').select('*').order('created_at', { ascending: false }),
    supabase.from('reserve_periods').select('*').order('start_date', { ascending: false }),
    supabase.from('departments').select('*').order('display_order'),
  ])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">ניהול</h1>
        <p className="text-slate-500 text-sm mt-0.5">הגדרות מערכת ומשתמשים</p>
      </div>

      <AdminPeriod periods={periods ?? []} />
      <AdminUsers users={users ?? []} />
    </div>
  )
}
