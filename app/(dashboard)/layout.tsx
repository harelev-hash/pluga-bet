import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/sidebar'
import { ROLE_LABELS } from '@/lib/utils'
import { DEFAULT_ROLE_PERMISSIONS } from '@/lib/permissions'
import type { UserRole } from '@/lib/types/database'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: appUser } = await supabase
    .from('app_users')
    .select('full_name, role, is_active')
    .eq('id', user.id)
    .single()

  if (!appUser || !appUser.is_active) redirect('/pending')

  // Fetch permissions for this role (fall back to defaults)
  const { data: rolePerms } = await supabase
    .from('role_permissions')
    .select('permissions')
    .eq('role', appUser.role)
    .single()

  const permissions: string[] = rolePerms?.permissions ?? DEFAULT_ROLE_PERMISSIONS[appUser.role] ?? []

  const displayName = appUser?.full_name ?? user.email ?? 'משתמש'
  const roleLabel = appUser?.role ? ROLE_LABELS[appUser.role as UserRole] : ''

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50" dir="rtl">
      <Sidebar userName={displayName} userRole={roleLabel} permissions={permissions} />

      <main className="flex-1 lg:mr-60 overflow-y-auto">
        <div className="p-4 lg:p-6 pt-14 lg:pt-6 min-h-full">
          {children}
        </div>
      </main>
    </div>
  )
}
