'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PERMISSION_ITEMS, PERMISSION_GROUPS, hasPermission } from '@/lib/permissions'
import { Lock, Check } from 'lucide-react'
import type { UserRole } from '@/lib/types/database'

interface RoleData {
  key: UserRole
  label: string
  permissions: string[]
}

interface Props {
  roles: RoleData[]
}

// Role badge colors
const ROLE_COLORS: Record<string, string> = {
  sys_admin: 'bg-red-100 text-red-700 border-red-200',
  hr:        'bg-blue-100 text-blue-700 border-blue-200',
  rsfp:      'bg-emerald-100 text-emerald-700 border-emerald-200',
  commander: 'bg-amber-100 text-amber-700 border-amber-200',
  viewer:    'bg-slate-100 text-slate-600 border-slate-200',
}

export default function AdminPermissions({ roles: initial }: Props) {
  const [roles, setRoles] = useState(initial)
  const [selectedRole, setSelectedRole] = useState<UserRole>(initial[0]?.key ?? 'hr')
  const [isPending, startTransition] = useTransition()
  const [savedRole, setSavedRole] = useState<string | null>(null)

  const current = roles.find(r => r.key === selectedRole)!
  const isSysAdmin = selectedRole === 'sys_admin'
  const perms = current.permissions

  const toggle = (key: string) => {
    if (isSysAdmin) return
    startTransition(async () => {
      const supabase = createClient()
      const newPerms = perms.includes(key)
        ? perms.filter(p => p !== key)
        : [...perms, key]

      await supabase
        .from('role_permissions')
        .upsert({ role: selectedRole, permissions: newPerms, updated_at: new Date().toISOString() })

      setRoles(prev => prev.map(r =>
        r.key === selectedRole ? { ...r, permissions: newPerms } : r
      ))
      setSavedRole(selectedRole)
      setTimeout(() => setSavedRole(null), 1500)
    })
  }

  const toggleGroup = (group: string) => {
    if (isSysAdmin) return
    const groupKeys = PERMISSION_ITEMS.filter(p => p.group === group).map(p => p.key)
    const allOn = groupKeys.every(k => perms.includes(k))
    const newPerms = allOn
      ? perms.filter(p => !groupKeys.includes(p))
      : [...new Set([...perms, ...groupKeys])]

    startTransition(async () => {
      const supabase = createClient()
      await supabase
        .from('role_permissions')
        .upsert({ role: selectedRole, permissions: newPerms, updated_at: new Date().toISOString() })
      setRoles(prev => prev.map(r =>
        r.key === selectedRole ? { ...r, permissions: newPerms } : r
      ))
      setSavedRole(selectedRole)
      setTimeout(() => setSavedRole(null), 1500)
    })
  }

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden" dir="rtl">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="font-semibold text-slate-800">הרשאות לפי תפקיד</h2>
        <p className="text-xs text-slate-400 mt-0.5">קבע מה כל תפקיד יכול לראות ולבצע במערכת</p>
      </div>

      <div className="flex min-h-96">
        {/* Left: Role list */}
        <div className="w-44 shrink-0 border-l border-slate-100 bg-slate-50 p-3 space-y-1.5">
          {roles.map(role => (
            <button
              key={role.key}
              onClick={() => setSelectedRole(role.key)}
              className={`w-full text-right px-3 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                selectedRole === role.key
                  ? `${ROLE_COLORS[role.key] ?? 'bg-blue-100 text-blue-700 border-blue-200'} shadow-sm`
                  : 'bg-white text-slate-600 border-transparent hover:border-slate-200 hover:bg-white'
              }`}
            >
              <div className="flex items-center gap-2">
                {role.key === 'sys_admin' && <Lock className="w-3 h-3 shrink-0 opacity-60" />}
                <span className="flex-1 truncate">{role.label}</span>
                {savedRole === role.key && <Check className="w-3 h-3 text-green-500 shrink-0" />}
              </div>
              {role.key !== 'sys_admin' && (
                <p className="text-xs opacity-60 mt-0.5 font-normal">
                  {role.permissions.length} הרשאות
                </p>
              )}
            </button>
          ))}
        </div>

        {/* Right: Permission toggles */}
        <div className="flex-1 p-5 overflow-y-auto">
          {isSysAdmin ? (
            <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl border border-red-100 text-red-700">
              <Lock className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-semibold text-sm">מנהל מערכת — גישה מלאה</p>
                <p className="text-xs opacity-80 mt-0.5">לתפקיד זה יש גישה לכל האפשרויות ולא ניתן לשנות זאת</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800">
                    {current.label}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {perms.length} הרשאות פעילות
                    {isPending && <span className="text-blue-400 mr-2">שומר...</span>}
                  </p>
                </div>
              </div>

              {PERMISSION_GROUPS.map(group => {
                const groupItems = PERMISSION_ITEMS.filter(p => p.group === group)
                const activeCount = groupItems.filter(p => perms.includes(p.key)).length
                const allOn = activeCount === groupItems.length

                return (
                  <div key={group}>
                    {/* Group header */}
                    <div className="flex items-center gap-2 mb-2.5">
                      <button
                        onClick={() => toggleGroup(group)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                          allOn
                            ? 'bg-blue-500 border-blue-500'
                            : activeCount > 0
                              ? 'bg-blue-100 border-blue-400'
                              : 'border-slate-300 hover:border-blue-400'
                        }`}
                        title={allOn ? 'בטל הכל בקבוצה' : 'סמן הכל בקבוצה'}
                      >
                        {allOn && <Check className="w-3 h-3 text-white" />}
                        {!allOn && activeCount > 0 && (
                          <div className="w-2 h-0.5 bg-blue-400 rounded" />
                        )}
                      </button>
                      <span className="text-sm font-semibold text-slate-700">{group}</span>
                      <span className="text-xs text-slate-400">({activeCount}/{groupItems.length})</span>
                    </div>

                    {/* Permission items */}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 pr-7">
                      {groupItems.map(item => {
                        const on = perms.includes(item.key)
                        return (
                          <label
                            key={item.key}
                            className="flex items-center gap-2.5 cursor-pointer group"
                          >
                            <button
                              onClick={() => toggle(item.key)}
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                                on
                                  ? 'bg-blue-500 border-blue-500'
                                  : 'border-slate-300 group-hover:border-blue-400'
                              }`}
                            >
                              {on && <Check className="w-3 h-3 text-white" />}
                            </button>
                            <span className={`text-sm transition-colors ${on ? 'text-slate-800' : 'text-slate-400'}`}>
                              {item.label}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
