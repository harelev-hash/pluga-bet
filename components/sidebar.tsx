'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  Shield, Users, CalendarCheck, ClipboardList,
  Package, RefreshCw, Target, Settings, LogOut,
  ChevronLeft, Menu, X
} from 'lucide-react'
import { useState } from 'react'

const NAV_ITEMS = [
  { href: '/',            label: 'לוח בקרה',     icon: Shield },
  { href: '/soldiers',   label: 'כוח אדם',      icon: Users },
  { href: '/attendance', label: 'נוכחות',        icon: CalendarCheck },
  { href: '/tracking',   label: 'מעקבים',        icon: ClipboardList },
  { href: '/equipment',  label: 'ציוד',          icon: Package },
  { href: '/melm',       label: 'מל"מ',          icon: RefreshCw },
  { href: '/ops',        label: 'מבצעי',         icon: Target },
  { href: '/admin',      label: 'ניהול',         icon: Settings },
]

interface SidebarProps {
  userName?: string | null
  userRole?: string | null
}

export default function Sidebar({ userName, userRole }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500 p-2 rounded-lg">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">פלוגה ב&apos; 7007</p>
            <p className="text-slate-400 text-xs">מערכת ניהול</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
              {isActive && <ChevronLeft className="w-3 h-3 mr-auto opacity-70" />}
            </Link>
          )
        })}
      </nav>

      {/* User + Logout */}
      <div className="p-3 border-t border-slate-700">
        <div className="px-3 py-2 mb-1">
          <p className="text-white text-sm font-medium truncate">{userName ?? 'משתמש'}</p>
          <p className="text-slate-400 text-xs">{userRole ?? ''}</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white text-sm transition-all"
        >
          <LogOut className="w-4 h-4" />
          יציאה
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed top-3 right-3 z-50 bg-slate-800 text-white p-2 rounded-lg shadow-lg"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside className={cn(
        'lg:hidden fixed top-0 right-0 h-full w-64 bg-slate-800 z-40 transform transition-transform duration-300',
        mobileOpen ? 'translate-x-0' : 'translate-x-full'
      )}>
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-slate-800 h-full fixed top-0 right-0 z-30">
        <SidebarContent />
      </aside>
    </>
  )
}
