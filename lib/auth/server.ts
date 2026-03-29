import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { hasPermission, DEFAULT_ROLE_PERMISSIONS } from '@/lib/permissions'

export async function requirePermission(key: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: appUser } = await supabase
    .from('app_users')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  if (!appUser || !appUser.is_active) redirect('/pending')

  const { data: rolePerms } = await supabase
    .from('role_permissions')
    .select('permissions')
    .eq('role', appUser.role)
    .single()

  const permissions: string[] = rolePerms?.permissions ?? DEFAULT_ROLE_PERMISSIONS[appUser.role as string] ?? []

  if (!hasPermission(permissions, key)) redirect('/')
}
