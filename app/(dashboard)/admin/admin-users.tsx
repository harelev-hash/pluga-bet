'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ROLE_LABELS } from '@/lib/utils'
import type { AppUser } from '@/lib/types/database'
import { formatDateTime } from '@/lib/utils'

const ROLES = ['sys_admin', 'hr', 'rsfp', 'commander', 'viewer'] as const

export default function AdminUsers({ users: initial }: { users: AppUser[] }) {
  const [isPending, startTransition] = useTransition()
  const [users, setUsers] = useState(initial)

  const updateRole = (userId: string, role: string) => {
    startTransition(async () => {
      const supabase = createClient()
      await supabase.from('app_users').update({ role }).eq('id', userId)
      setUsers(u => u.map(x => x.id === userId ? { ...x, role } : x))
    })
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100">
      <div className="p-4 border-b border-slate-100">
        <h2 className="font-semibold text-slate-700">משתמשים</h2>
        <p className="text-xs text-slate-400 mt-0.5">משתמשים מתווספים אוטומטית בכניסה הראשונה</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">שם</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">אימייל</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">הצטרף</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">תפקיד</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-800 text-sm">{u.full_name ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-slate-500">{u.email}</td>
                <td className="px-4 py-3 text-xs text-slate-400">{formatDateTime(u.created_at)}</td>
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    onChange={e => updateRole(u.id, e.target.value)}
                    disabled={isPending}
                    className="border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
                  >
                    {ROLES.map(r => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400 text-sm">אין משתמשים</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
