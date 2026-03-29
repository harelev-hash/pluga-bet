import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminUsers from './admin-users'
import AdminPeriod from './admin-period'
import AdminPermissions from './admin-permissions'
import Link from 'next/link'
import { ROLE_LABELS } from '@/lib/utils'
import type { UserRole } from '@/lib/types/database'

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const supabase = await createClient()

  // Guard: only sys_admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: me } = await supabase.from('app_users').select('role').eq('id', user.id).single()
  if (me?.role !== 'sys_admin') redirect('/')

  const { tab = 'users' } = await searchParams

  const [{ data: users }, { data: periods }, { data: rolePermissions }] = await Promise.all([
    supabase.from('app_users').select('*').order('created_at', { ascending: false }),
    supabase.from('reserve_periods').select('*').order('start_date', { ascending: false }),
    supabase.from('role_permissions').select('role, permissions').order('role'),
  ])

  const tabs = [
    { key: 'users',       label: 'משתמשים' },
    { key: 'periods',     label: 'תקופות' },
    { key: 'permissions', label: 'הרשאות' },
  ]

  // Build rolePermsMap: role → permissions[]
  const rolePermsMap: Record<string, string[]> = {}
  for (const rp of rolePermissions ?? []) {
    rolePermsMap[rp.role] = rp.permissions
  }

  // Roles list for permissions editor
  const roles = Object.entries(ROLE_LABELS).map(([key, label]) => ({
    key: key as UserRole,
    label,
    permissions: rolePermsMap[key] ?? [],
  }))

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">ניהול</h1>
        <p className="text-slate-500 text-sm mt-0.5">משתמשים, תקופות והרשאות מערכת</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <Link
            key={t.key}
            href={`/admin?tab=${t.key}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === 'users' && <AdminUsers users={users ?? []} />}
      {tab === 'periods' && <AdminPeriod periods={periods ?? []} />}
      {tab === 'permissions' && <AdminPermissions roles={roles} />}
    </div>
  )
}
