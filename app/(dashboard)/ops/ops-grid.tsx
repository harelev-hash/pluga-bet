'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, Check } from 'lucide-react'

interface Post { id: number; name: string; required_certification?: string | null; min_soldiers?: number | null }
interface Soldier {
  id: number
  full_name: string
  rank: string
  certifications: string[]
  department?: { id: number; name: string } | null
}
interface Assignment { id?: number; post_id: number; soldier_id: number; date: string; shift?: string }

interface Props {
  posts: Post[]
  soldiers: Soldier[]
  date: string
  assignments: Assignment[]
}

const SHIFTS = ['בוקר', 'צהריים', 'לילה']

export default function OpsGrid({ posts, soldiers, date, assignments: initial }: Props) {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  // Map: postId-shift -> soldierId
  const initMap = () => {
    const m: Record<string, number | ''> = {}
    initial.forEach(a => {
      const key = `${a.post_id}-${a.shift ?? 'בוקר'}`
      m[key] = a.soldier_id
    })
    return m
  }
  const [grid, setGrid] = useState<Record<string, number | ''>>(initMap)

  const setCell = (postId: number, shift: string, soldierId: number | '') => {
    setSaved(false)
    setGrid(g => ({ ...g, [`${postId}-${shift}`]: soldierId }))
  }

  const handleSave = () => {
    setSaved(false)
    startTransition(async () => {
      const supabase = createClient()
      // Delete all for date and re-insert
      await supabase.from('operational_assignments').delete().eq('date', date)
      const rows: any[] = []
      Object.entries(grid).forEach(([key, soldierId]) => {
        if (!soldierId) return
        const [postId, shift] = key.split('-')
        rows.push({ post_id: parseInt(postId), soldier_id: soldierId, date, shift })
      })
      if (rows.length > 0) {
        await supabase.from('operational_assignments').insert(rows)
      }
      setSaved(true)
    })
  }

  const getSoldierById = (id: number | '') => soldiers.find(s => s.id === id)

  // Filter soldiers eligible for a post (by certification)
  const eligibleSoldiers = (post: Post) => {
    if (!post.required_certification) return soldiers
    return soldiers.filter(s => s.certifications?.includes(post.required_certification!))
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {isPending ? 'שומר...' : saved ? 'נשמר' : 'שמור שיבוץ'}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">עמדה</th>
              {SHIFTS.map(shift => (
                <th key={shift} className="px-4 py-3 text-right text-xs font-semibold text-slate-500">{shift}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {posts.map(post => (
              <tr key={post.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <span className="font-medium text-slate-800 text-sm">{post.name}</span>
                  {post.required_certification && (
                    <span className="text-xs text-slate-400 block">{post.required_certification}</span>
                  )}
                </td>
                {SHIFTS.map(shift => {
                  const key = `${post.id}-${shift}`
                  const currentId = grid[key] ?? ''
                  return (
                    <td key={shift} className="px-4 py-3">
                      <select
                        value={currentId}
                        onChange={e => setCell(post.id, shift, e.target.value ? parseInt(e.target.value) : '')}
                        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                      >
                        <option value="">— פנוי —</option>
                        {eligibleSoldiers(post).map(s => (
                          <option key={s.id} value={s.id}>{s.full_name}</option>
                        ))}
                      </select>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {posts.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 py-12 text-center">
          <p className="text-slate-400">לא הוגדרו עמדות שמירה</p>
        </div>
      )}
    </div>
  )
}
