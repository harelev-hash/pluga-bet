import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/sidebar'
import { ROLE_LABELS } from '@/lib/utils'
import type { UserRole } from '@/lib/types/database'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: appUser } = await supabase
    .from('app_users')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  const displayName = appUser?.full_name ?? user.email ?? 'משתמש'
  const roleLabel = appUser?.role ? ROLE_LABELS[appUser.role as UserRole] : ''

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50" dir="rtl">
      <Sidebar userName={displayName} userRole={roleLabel} />

      {/* Main content */}
      <main className="flex-1 lg:mr-60 overflow-y-auto">
        <div className="p-4 lg:p-6 pt-14 lg:pt-6 min-h-full">
          {children}
        </div>
      </main>
    </div>
  )
}
