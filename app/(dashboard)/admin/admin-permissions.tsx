'use client'

import { useState, useTransition, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PERMISSION_ITEMS, PERMISSION_GROUPS } from '@/lib/permissions'
import { Lock, Check, Pencil, Plus, X } from 'lucide-react'

interface RoleData {
  key: string
  label: string
  permissions: string[]
}

interface Props {
  roles: RoleData[]
}

const ROLE_COLORS: Record<string, string> = {
  sys_admin: 'bg-red-100 text-red-700 border-red-200',
  hr:        'bg-blue-100 text-blue-700 border-blue-200',
  rsfp:      'bg-emerald-100 text-emerald-700 border-emerald-200',
  commander: 'bg-amber-100 text-amber-700 border-amber-200',
  viewer:    'bg-slate-100 text-slate-600 border-slate-200',
}

export default function AdminPermissions({ roles: initial }: Props) {
  const [roles, setRoles] = useState(initial)
  const [selectedRole, setSelectedRole] = useState<string>(initial[0]?.key ?? 'hr')
  const [isPending, startTransition] = useTransition()
  const [savedRole, setSavedRole] = useState<string | null>(null)

  // Label editing
  const [editingLabel, setEditingLabel] = useState<string | null>(null)
  const [labelInput, setLabelInput] = useState('')
  const labelRef = useRef<HTMLInputElement>(null)

  // New role form
  const [addingRole, setAddingRole] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [addError, setAddError] = useState<string | null>(null)

  const current = roles.find(r => r.key === selectedRole)
  const isSysAdmin = selectedRole === 'sys_admin'
  const perms = current?.permissions ?? []

  const flash = (role: string) => {
    setSavedRole(role)
    setTimeout(() => setSavedRole(null), 1500)
  }

  /* ── Toggle single permission ── */
  const toggle = (key: string) => {
    if (isSysAdmin) return
    startTransition(async () => {
      const supabase = createClient()
      const newPerms = perms.includes(key) ? perms.filter(p => p !== key) : [...perms, key]
      await supabase.from('role_permissions')
        .upsert({ role: selectedRole, permissions: newPerms, updated_at: new Date().toISOString() })
      setRoles(prev => prev.map(r => r.key === selectedRole ? { ...r, permissions: newPerms } : r))
      flash(selectedRole)
    })
  }

  /* ── Toggle entire group ── */
  const toggleGroup = (group: string) => {
    if (isSysAdmin) return
    const groupKeys = PERMISSION_ITEMS.filter(p => p.group === group).map(p => p.key)
    const allOn = groupKeys.every(k => perms.includes(k))
    const newPerms = allOn
      ? perms.filter(p => !groupKeys.includes(p))
      : [...new Set([...perms, ...groupKeys])]
    startTransition(async () => {
      const supabase = createClient()
      await supabase.from('role_permissions')
        .upsert({ role: selectedRole, permissions: newPerms, updated_at: new Date().toISOString() })
      setRoles(prev => prev.map(r => r.key === selectedRole ? { ...r, permissions: newPerms } : r))
      flash(selectedRole)
    })
  }

  /* ── Save renamed label ── */
  const saveLabel = (roleKey: string) => {
    const trimmed = labelInput.trim()
    if (!trimmed || trimmed === roles.find(r => r.key === roleKey)?.label) {
      setEditingLabel(null); return
    }
    startTransition(async () => {
      const supabase = createClient()
      await supabase.from('role_permissions').update({ label: trimmed }).eq('role', roleKey)
      setRoles(prev => prev.map(r => r.key === roleKey ? { ...r, label: trimmed } : r))
      setEditingLabel(null)
      flash(roleKey)
    })
  }

  /* ── Add new role ── */
  const addRole = () => {
    setAddError(null)
    const key = newKey.trim()
    const label = newLabel.trim()
    if (!key) { setAddError('נדרש מזהה פנימי'); return }
    if (!label) { setAddError('נדרש שם תצוגה'); return }
    if (!/^[a-z0-9_]+$/.test(key)) { setAddError('המזהה יכיל רק אותיות לטיניות קטנות, מספרים וקו תחתון'); return }
    if (roles.some(r => r.key === key)) { setAddError('מזהה זה כבר קיים'); return }
    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase.from('role_permissions')
        .insert({ role: key, label, permissions: [] })
      if (error) { setAddError(error.message); return }
      setRoles(prev => [...prev, { key, label, permissions: [] }])
      setSelectedRole(key)
      setAddingRole(false)
      setNewKey(''); setNewLabel('')
    })
  }

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden" dir="rtl">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="font-semibold text-slate-800">הרשאות לפי תפקיד</h2>
        <p className="text-xs text-slate-400 mt-0.5">קבע מה כל תפקיד יכול לראות ולבצע במערכת</p>
      </div>

      <div className="flex min-h-96">
        {/* ── Left: Role list ── */}
        <div className="w-48 shrink-0 border-l border-slate-100 bg-slate-50 p-3 space-y-1.5">
          {roles.map(role => {
            const isSelected = selectedRole === role.key
            const isEditing = editingLabel === role.key
            const color = ROLE_COLORS[role.key] ?? 'bg-purple-100 text-purple-700 border-purple-200'

            return (
              <div key={role.key}>
                <button
                  onClick={() => { setSelectedRole(role.key); setEditingLabel(null) }}
                  className={`w-full text-right px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                    isSelected ? `${color} shadow-sm` : 'bg-white text-slate-600 border-transparent hover:border-slate-200 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {role.key === 'sys_admin' && <Lock className="w-3 h-3 shrink-0 opacity-50" />}
                    <span className="flex-1 truncate text-right">{role.label}</span>
                    {savedRole === role.key && <Check className="w-3 h-3 text-green-500 shrink-0" />}
                    {isSelected && role.key !== 'sys_admin' && !isEditing && (
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          setEditingLabel(role.key)
                          setLabelInput(role.label)
                          setTimeout(() => labelRef.current?.focus(), 50)
                        }}
                        className="p-0.5 rounded hover:bg-black/10 transition-colors shrink-0"
                        title="שנה שם"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  {role.key !== 'sys_admin' && !isEditing && (
                    <p className="text-xs opacity-50 mt-0.5 font-normal">
                      {role.permissions.length} הרשאות · <span className="font-mono">{role.key}</span>
                    </p>
                  )}
                </button>

                {/* Inline label editor */}
                {isEditing && (
                  <div className="mt-1 px-1 flex gap-1">
                    <input
                      ref={labelRef}
                      value={labelInput}
                      onChange={e => setLabelInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveLabel(role.key)
                        if (e.key === 'Escape') setEditingLabel(null)
                      }}
                      className="flex-1 min-w-0 border border-blue-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                    <button onClick={() => saveLabel(role.key)} className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600">
                      <Check className="w-3 h-3" />
                    </button>
                    <button onClick={() => setEditingLabel(null)} className="p-1 text-slate-400 hover:text-slate-600">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}

          {/* Add role button / form */}
          {!addingRole ? (
            <button
              onClick={() => { setAddingRole(true); setAddError(null) }}
              className="w-full flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-700 hover:bg-white border border-dashed border-slate-200 hover:border-slate-400 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> הוסף תפקיד
            </button>
          ) : (
            <div className="bg-white border border-slate-200 rounded-lg p-2.5 space-y-2">
              <p className="text-xs font-semibold text-slate-600">תפקיד חדש</p>
              <div>
                <label className="text-xs text-slate-400">שם תצוגה</label>
                <input
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  placeholder='רופא'
                  className="w-full border border-slate-200 rounded px-2 py-1 text-xs mt-0.5 focus:outline-none focus:ring-1 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">מזהה פנימי (אנגלית)</label>
                <input
                  value={newKey}
                  onChange={e => setNewKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  onKeyDown={e => e.key === 'Enter' && addRole()}
                  placeholder='medic'
                  className="w-full border border-slate-200 rounded px-2 py-1 text-xs mt-0.5 font-mono focus:outline-none focus:ring-1 focus:ring-blue-300"
                />
              </div>
              {addError && <p className="text-xs text-red-500">{addError}</p>}
              <div className="flex gap-1.5">
                <button
                  onClick={addRole}
                  disabled={isPending}
                  className="flex-1 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded text-xs font-medium transition-colors"
                >
                  הוסף
                </button>
                <button
                  onClick={() => { setAddingRole(false); setAddError(null); setNewKey(''); setNewLabel('') }}
                  className="px-2 py-1.5 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ביטול
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Permission toggles ── */}
        <div className="flex-1 p-5 overflow-y-auto">
          {!current ? null : isSysAdmin ? (
            <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl border border-red-100 text-red-700">
              <Lock className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-semibold text-sm">מנהל מערכת — גישה מלאה</p>
                <p className="text-xs opacity-80 mt-0.5">לתפקיד זה יש גישה לכל האפשרויות ולא ניתן לשנות זאת</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-slate-800">{current.label}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {perms.length} הרשאות פעילות
                  {isPending && <span className="text-blue-400 mr-2">שומר...</span>}
                </p>
              </div>

              {PERMISSION_GROUPS.map(group => {
                const groupItems = PERMISSION_ITEMS.filter(p => p.group === group)
                const activeCount = groupItems.filter(p => perms.includes(p.key)).length
                const allOn = activeCount === groupItems.length

                return (
                  <div key={group}>
                    <div className="flex items-center gap-2 mb-2.5">
                      <button
                        onClick={() => toggleGroup(group)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                          allOn ? 'bg-blue-500 border-blue-500'
                          : activeCount > 0 ? 'bg-blue-100 border-blue-400'
                          : 'border-slate-300 hover:border-blue-400'
                        }`}
                      >
                        {allOn && <Check className="w-3 h-3 text-white" />}
                        {!allOn && activeCount > 0 && <div className="w-2 h-0.5 bg-blue-400 rounded" />}
                      </button>
                      <span className="text-sm font-semibold text-slate-700">{group}</span>
                      <span className="text-xs text-slate-400">({activeCount}/{groupItems.length})</span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 pr-7">
                      {groupItems.map(item => {
                        const on = perms.includes(item.key)
                        return (
                          <label key={item.key} className="flex items-center gap-2.5 cursor-pointer group">
                            <button
                              onClick={() => toggle(item.key)}
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                                on ? 'bg-blue-500 border-blue-500' : 'border-slate-300 group-hover:border-blue-400'
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
