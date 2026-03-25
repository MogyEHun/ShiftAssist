'use client'

import { useState } from 'react'
import { Plus, Clock, UmbrellaOff, Search } from 'lucide-react'
import { LeaveRequest, LeaveStatus } from '@/types'
import { LeaveRequestModal } from './LeaveRequestModal'
import { LeaveList } from './LeaveList'
import { useTranslation } from '@/components/providers/LanguageProvider'

interface SiteItem { id: string; name: string }
interface UserItem { id: string; full_name: string; site_id: string | null }

interface Props {
  requests: LeaveRequest[]
  isManager: boolean
  pendingCount: number
  highlightUserId?: string
  showHeader?: boolean
  sites?: SiteItem[]
  users?: UserItem[]
}

export function LeaveClient({ requests: initial, isManager, pendingCount, showHeader, sites = [], users = [] }: Props) {
  const [requests, setRequests] = useState(initial)
  const [showModal, setShowModal] = useState(false)
  const [searchName, setSearchName] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSite, setFilterSite] = useState('')
  const { t } = useTranslation()

  function handleSaved(req: LeaveRequest) {
    setRequests((prev) => [req, ...prev])
  }

  function handleUpdated(id: string, status: LeaveStatus, note?: string) {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status, manager_note: note || r.manager_note } : r
      )
    )
  }

  // ── Dolgozói nézet ──────────────────────────────────────────────
  if (!isManager) {
    return (
      <div>
        {showHeader && (
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-1">
              <UmbrellaOff className="h-6 w-6 text-[#1a5c3a]" />
              <h1 className="text-2xl font-bold text-gray-900">{t('leave.pageTitle')}</h1>
            </div>
            <p className="text-sm text-gray-500 ml-9">{t('leave.manageTrack')}</p>
          </div>
        )}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold text-gray-800">{t('leave.title')}</h2>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#1a5c3a] text-white text-sm font-medium rounded-xl hover:bg-[#15472e] transition-colors"
          >
            <Plus className="h-4 w-4" />
            {t('leave.request')}
          </button>
        </div>

        <LeaveList requests={requests} isManager={false} onUpdate={handleUpdated} />

        {showModal && (
          <LeaveRequestModal onSave={handleSaved} onClose={() => setShowModal(false)} />
        )}
      </div>
    )
  }

  // ── Vezetői nézet ───────────────────────────────────────────────
  const siteUserIds = filterSite
    ? new Set(users.filter(u => u.site_id === filterSite).map(u => u.id))
    : null

  const filtered = requests.filter(r => {
    if (filterType && r.type !== filterType) return false
    if (filterStatus && r.status !== filterStatus) return false
    if (siteUserIds && !siteUserIds.has(r.user_id)) return false
    if (searchName) {
      const name = ((r.user as any)?.full_name ?? '').toLowerCase()
      if (!name.includes(searchName.toLowerCase())) return false
    }
    return true
  })

  const grouped = Object.entries(
    filtered.reduce((acc, r) => {
      acc[r.user_id] = acc[r.user_id] ?? []
      acc[r.user_id].push(r)
      return acc
    }, {} as Record<string, LeaveRequest[]>)
  ).sort(([, a], [, b]) => {
    const aPending = a.some(r => r.status === 'pending') ? -1 : 1
    const bPending = b.some(r => r.status === 'pending') ? -1 : 1
    return aPending - bPending
  })

  return (
    <div>
      {showHeader && (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <UmbrellaOff className="h-6 w-6 text-[#1a5c3a]" />
            <h1 className="text-2xl font-bold text-gray-900">{t('leave.pageTitle')}</h1>
          </div>
          <p className="text-sm text-gray-500 ml-9">{t('leave.manageTrack')}</p>
        </div>
      )}
      {/* Szűrők */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchName}
            onChange={e => setSearchName(e.target.value)}
            placeholder="Dolgozó neve..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#1a5c3a]/20 focus:border-[#1a5c3a]"
          />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#1a5c3a]/20 focus:border-[#1a5c3a]">
          <option value="">Minden típus</option>
          <option value="vacation">Szabadság</option>
          <option value="sick">Betegség</option>
          <option value="personal">Személyes</option>
          <option value="other">Egyéb</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#1a5c3a]/20 focus:border-[#1a5c3a]">
          <option value="">Minden státusz</option>
          <option value="pending">Függőben</option>
          <option value="approved">Jóváhagyva</option>
          <option value="rejected">Elutasítva</option>
        </select>
        {sites.length > 0 && (
          <select value={filterSite} onChange={e => setFilterSite(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#1a5c3a]/20 focus:border-[#1a5c3a]">
            <option value="">Minden telephely</option>
            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
      </div>

      {/* Fejléc */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-gray-800">{t('staff.title')} – {t('leave.title')}</h2>
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl">
            <Clock className="h-4 w-4 flex-shrink-0" />
            <span><strong>{pendingCount}</strong> {t('leave.pendingApproval')}</span>
          </div>
        )}
      </div>

      {grouped.length === 0 && (
        <div className="text-center py-16 text-gray-400 text-sm">
          {t('leave.noRequests')}
        </div>
      )}

      {/* Dolgozónkénti csoportok */}
      {grouped.map(([userId, empReqs]) => {
        const user = (empReqs[0].user as any)
        const hasPending = empReqs.some(r => r.status === 'pending')
        const initials = user?.full_name?.slice(0, 2).toUpperCase() ?? '??'

        return (
          <div key={userId} className="mb-8">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
              <div className="h-7 w-7 rounded-full bg-[#1a5c3a]/10 flex items-center justify-center text-xs font-bold text-[#1a5c3a] flex-shrink-0">
                {initials}
              </div>
              <span className="font-semibold text-gray-900 text-sm">{user?.full_name}</span>
              {user?.position && (
                <span className="text-gray-400 text-sm">· {user.position}</span>
              )}
              {hasPending && (
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                  {t('leave.approve')}
                </span>
              )}
            </div>
            <LeaveList
              requests={empReqs}
              isManager={true}
              onUpdate={handleUpdated}
              hideUserName={true}
            />
          </div>
        )
      })}
    </div>
  )
}
