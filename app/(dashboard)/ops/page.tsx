import { getPermissions } from '@/lib/auth/server'
import { hasPermission } from '@/lib/permissions'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CalendarDays, Settings2 } from 'lucide-react'

export default async function OpsPage() {
  const permissions = await getPermissions()
  if (!hasPermission(permissions, 'nav:ops')) redirect('/')

  const canEdit   = hasPermission(permissions, 'ops:edit')
  const canManage = hasPermission(permissions, 'ops:manage')

  return (
    <div className="max-w-3xl mx-auto space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">מבצעי</h1>
        <p className="text-slate-500 text-sm mt-0.5">שיבוץ יומי וניהול עמדות</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Link
          href="/ops/schedule"
          className="flex flex-col items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl p-8 shadow-sm transition-colors"
        >
          <CalendarDays className="w-10 h-10" />
          <span className="text-xl font-bold">שיבוץ יומי</span>
          <span className="text-blue-200 text-sm text-center">תצוגה ועריכת השיבוץ לפי יום</span>
        </Link>

        {canManage ? (
          <Link
            href="/ops/duty-types"
            className="flex flex-col items-center justify-center gap-3 bg-slate-700 hover:bg-slate-800 text-white rounded-2xl p-8 shadow-sm transition-colors"
          >
            <Settings2 className="w-10 h-10" />
            <span className="text-xl font-bold">ניהול עמדות</span>
            <span className="text-slate-400 text-sm text-center">הגדרת עמדות, משמרות וכוננויות</span>
          </Link>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 bg-slate-100 text-slate-400 rounded-2xl p-8 cursor-not-allowed">
            <Settings2 className="w-10 h-10" />
            <span className="text-xl font-bold">ניהול עמדות</span>
            <span className="text-slate-300 text-sm text-center">אין הרשאה לניהול הגדרות</span>
          </div>
        )}
      </div>
    </div>
  )
}
