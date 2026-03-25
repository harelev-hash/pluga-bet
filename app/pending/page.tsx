import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Clock } from 'lucide-react'

export default async function PendingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: appUser } = await supabase
    .from('app_users')
    .select('is_active')
    .eq('id', user.id)
    .single()

  // If already active, send to dashboard
  if (appUser?.is_active) redirect('/')

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center" dir="rtl">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 max-w-md w-full text-center space-y-5">
        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto">
          <Clock className="w-8 h-8 text-amber-500" />
        </div>
        <h1 className="text-xl font-bold text-slate-800">ממתין לאישור</h1>
        <p className="text-slate-500 leading-relaxed">
          החשבון שלך נוצר בהצלחה.<br />
          מנהל המערכת צריך לאשר את הגישה שלך לפני שתוכל להיכנס.
        </p>
        <p className="text-sm text-slate-400">
          המשתמש שלך: <span className="font-mono text-slate-600">{user.email}</span>
        </p>
        <form action="/auth/signout" method="POST">
          <button
            type="submit"
            className="text-sm text-slate-500 hover:text-slate-700 underline"
          >
            התנתק
          </button>
        </form>
      </div>
    </div>
  )
}
