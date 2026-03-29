import { createClient } from '@/lib/supabase/server'
import { formatDate, todayISO, ATTENDANCE_LABELS } from '@/lib/utils'
import { Users, UserCheck, Eye, RefreshCw, ClipboardList, Target, Package } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const today = todayISO()

  // Fetch stats in parallel
  const [
    { count: totalSoldiers },
    { count: activeSoldiers },
    { data: currentPeriod },
    { data: todayAttendance },
    { data: openMelm },
    { data: recentTracking },
  ] = await Promise.all([
    supabase.from('soldiers').select('*', { count: 'exact', head: true }),
    supabase.from('soldiers').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('reserve_periods').select('*').eq('is_current', true).single(),
    supabase
      .from('daily_attendance')
      .select('status')
      .eq('date', today),
    supabase
      .from('melm_requests')
      .select('id, department_id, departments(name)')
      .in('status', ['open', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('tracking_events')
      .select('id, title, event_date, is_closed')
      .eq('is_closed', false)
      .order('event_date', { ascending: false })
      .limit(5),
  ])

  const presentToday = todayAttendance?.filter(a => a.status === 'present').length ?? 0
  const totalToday = todayAttendance?.length ?? 0

  const stats = [
    {
      label: 'חיילים פעילים',
      value: activeSoldiers ?? 0,
      sub: `מתוך ${totalSoldiers ?? 0} סה"כ`,
      icon: Users,
      color: 'bg-blue-50 text-blue-600',
      href: '/soldiers',
    },
    {
      label: 'נוכחים היום',
      value: presentToday,
      sub: totalToday > 0 ? `מתוך ${totalToday} מדווחים` : 'לא דווח',
      icon: UserCheck,
      color: 'bg-green-50 text-green-600',
      href: '/attendance',
    },
    {
      label: 'מל"מ פתוח',
      value: openMelm?.length ?? 0,
      sub: 'בקשות ממתינות',
      icon: RefreshCw,
      color: 'bg-orange-50 text-orange-600',
      href: '/melm',
    },
    {
      label: 'מעקבים פעילים',
      value: recentTracking?.length ?? 0,
      sub: 'לא נסגרו',
      icon: ClipboardList,
      color: 'bg-purple-50 text-purple-600',
      href: '/tracking',
    },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">לוח בקרה</h1>
        <p className="text-slate-500 text-sm mt-1">
          {currentPeriod
            ? `${currentPeriod.name} · החל מ-${formatDate(currentPeriod.start_date)}`
            : 'לא מוגדר סבב פעיל'}
          {' · '}
          {new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Link key={s.href} href={s.href} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-lg ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-800">{s.value}</p>
            <p className="text-sm font-medium text-slate-600 mt-0.5">{s.label}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.sub}</p>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Open MELM */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-700 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-orange-500" />
              מל&quot;מ פתוח
            </h2>
            <Link href="/melm" className="text-xs text-blue-600 hover:underline">הכל</Link>
          </div>
          <div className="divide-y divide-slate-50">
            {openMelm && openMelm.length > 0 ? openMelm.map((m: any) => (
              <div key={m.id} className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-slate-700">{(m.departments as any)?.name ?? 'לא ידוע'}</span>
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">פתוח</span>
              </div>
            )) : (
              <p className="px-4 py-6 text-sm text-slate-400 text-center">אין מל&quot;מ פתוח</p>
            )}
          </div>
        </div>

        {/* Active tracking events */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-700 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-purple-500" />
              מעקבים פעילים
            </h2>
            <Link href="/tracking" className="text-xs text-blue-600 hover:underline">הכל</Link>
          </div>
          <div className="divide-y divide-slate-50">
            {recentTracking && recentTracking.length > 0 ? recentTracking.map((t) => (
              <Link key={t.id} href={`/tracking/${t.id}`} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors block">
                <span className="text-sm text-slate-700">{t.title}</span>
                <span className="text-xs text-slate-400">{formatDate(t.event_date)}</span>
              </Link>
            )) : (
              <p className="px-4 py-6 text-sm text-slate-400 text-center">אין מעקבים פעילים</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
        <h2 className="font-semibold text-slate-700 mb-4">פעולות מהירות</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/attendance" className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors">
            <UserCheck className="w-4 h-4" />
            עדכן נוכחות
          </Link>
          <Link href="/tracking/new" className="flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors">
            <ClipboardList className="w-4 h-4" />
            מעקב חדש
          </Link>
          <Link href="/melm/request" className="flex items-center gap-2 bg-orange-50 text-orange-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-100 transition-colors">
            <RefreshCw className="w-4 h-4" />
            מל&quot;מ חדש
          </Link>
          <Link href="/ops" className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors">
            <Target className="w-4 h-4" />
            שיבוץ יומי
          </Link>
          <Link href="/equipment/green-eyes" className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors">
            <Eye className="w-4 h-4" />
            ירוק בעיניים
          </Link>
          <Link href="/equipment/sign" className="flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">
            <Package className="w-4 h-4" />
            החתמת ציוד
          </Link>
        </div>
      </div>
    </div>
  )
}
