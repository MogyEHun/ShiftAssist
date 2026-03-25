'use client'

import { useState } from 'react'
import { UserPlus, Search, MoreVertical, Mail, Shield, UserX, UserCheck, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { InviteModal } from './InviteModal'
import { EditStaffModal } from './EditStaffModal'
import { deactivateStaff, activateStaff } from '@/app/actions/staff'
import type { SiteWithCount } from '@/app/actions/sites'
import { useTranslation } from '@/components/providers/LanguageProvider'

interface StaffMember {
  id: string
  full_name: string
  email: string
  role: string
  position: string | null
  hourly_rate: number | null
  is_active: boolean
  created_at: string
}

interface Position {
  id: string
  name: string
}

interface Props {
  staff: StaffMember[]
  positions: Position[]
  currentUserId: string
  currentUserRole: string
  isPrivileged: boolean
  sites?: SiteWithCount[]
  defaultSiteFilter?: string
}

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-[#d4a017]/15 text-[#b8891a]',
  admin: 'bg-purple-100 text-purple-700',
  manager: 'bg-blue-100 text-blue-700',
  employee: 'bg-gray-100 text-gray-600',
}

export function StaffClient({ staff, positions, currentUserId, currentUserRole, isPrivileged, sites = [], defaultSiteFilter = '' }: Props) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [siteFilter, setSiteFilter] = useState<string>(defaultSiteFilter)
  const [showInvite, setShowInvite] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [localStaff, setLocalStaff] = useState(staff)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const ROLE_LABELS: Record<string, string> = {
    owner: t('roles.owner'),
    admin: 'Admin',
    manager: t('roles.manager'),
    employee: t('roles.employee'),
  }

  // Pozíció javaslatok: positions tábla + dolgozók meglévő position mezői (egyedi)
  const combinedPositions: Position[] = [
    ...positions,
    ...localStaff
      .map(s => s.position)
      .filter((p): p is string => !!p && !positions.some(pos => pos.name === p))
      .filter((p, i, arr) => arr.indexOf(p) === i)
      .map(name => ({ id: name, name })),
  ]

  const filtered = localStaff.filter((u) => {
    const matchesSearch =
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.position ?? '').toLowerCase().includes(search.toLowerCase())
    const matchesSite = !siteFilter || (u as any).site_id === siteFilter
    return matchesSearch && matchesSite
  })

  async function handleToggleActive(member: StaffMember) {
    setActionLoading(member.id)
    const fn = member.is_active ? deactivateStaff : activateStaff
    const result = await fn(member.id)
    if (!result?.error) {
      setLocalStaff((prev) =>
        prev.map((u) => u.id === member.id ? { ...u, is_active: !u.is_active } : u)
      )
    }
    setOpenMenuId(null)
    setActionLoading(null)
  }

  return (
    <div className="p-8">
      {/* Fejléc */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('staff.title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{localStaff.filter(u => u.is_active).length} {t('staff.activeCount')}</p>
        </div>
        {isPrivileged && (
          <Button onClick={() => setShowInvite(true)}>
            <UserPlus className="h-4 w-4" />
            {t('staff.invite')}
          </Button>
        )}
      </div>

      {/* Kereső + site szűrő */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder={t('staff.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#1a5c3a] focus:ring-2 focus:ring-[#1a5c3a]/20"
          />
        </div>
        {sites.length > 0 && (
          <select
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#1a5c3a] focus:ring-2 focus:ring-[#1a5c3a]/20 bg-white text-gray-700"
          >
            <option value="">{t('staff.allSites')}</option>
            {sites.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Táblázat */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('staff.colName')}</th>
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('staff.colPosition')}</th>
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('staff.colRole')}</th>
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('staff.colStatus')}</th>
              {isPrivileged && (
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('staff.colHourlyRate')}</th>
              )}
              {isPrivileged && (
                <th className="px-6 py-3.5" />
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                  {search ? t('staff.noResults') : t('staff.empty')}
                </td>
              </tr>
            ) : (
              filtered.map((member) => (
                <tr key={member.id} className={`hover:bg-gray-50/50 transition-colors ${!member.is_active ? 'opacity-50' : ''}`}>
                  {/* Név + email */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-[#1a5c3a]/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-[#1a5c3a]">
                          {member.full_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{member.full_name}</p>
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Mail className="h-3 w-3" />{member.email}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Pozíció */}
                  <td className="px-6 py-4 text-gray-600">{member.position ?? '–'}</td>

                  {/* Szerepkör */}
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${ROLE_COLORS[member.role] ?? 'bg-gray-100 text-gray-600'}`}>
                      <Shield className="h-3 w-3" />
                      {ROLE_LABELS[member.role] ?? member.role}
                    </span>
                  </td>

                  {/* Státusz */}
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                      member.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${member.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                      {member.is_active ? t('staff.active') : t('staff.inactive')}
                    </span>
                  </td>

                  {/* Órabér */}
                  {isPrivileged && (
                    <td className="px-6 py-4 text-gray-600">
                      {member.hourly_rate ? `${member.hourly_rate.toLocaleString('hu-HU')} Ft/h` : '–'}
                    </td>
                  )}

                  {/* Akciók */}
                  {isPrivileged && (
                    <td className="px-6 py-4 text-right relative">
                      {member.id !== currentUserId && (
                        <div className="relative inline-block">
                          <button
                            onClick={() => setOpenMenuId(openMenuId === member.id ? null : member.id)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>

                          {openMenuId === member.id && (
                            <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-gray-100 z-10 py-1">
                              <button
                                onClick={() => { setEditingStaff(member); setOpenMenuId(null) }}
                                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Pencil className="h-4 w-4 text-gray-400" />
                                {t('staff.edit')}
                              </button>
                              <button
                                onClick={() => handleToggleActive(member)}
                                disabled={actionLoading === member.id}
                                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm hover:bg-gray-50 disabled:opacity-50"
                              >
                                {member.is_active ? (
                                  <><UserX className="h-4 w-4 text-red-400" /><span className="text-red-600">{t('staff.deactivate')}</span></>
                                ) : (
                                  <><UserCheck className="h-4 w-4 text-green-500" /><span className="text-green-700">{t('staff.activate')}</span></>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Meghívó modal */}
      {showInvite && (
        <InviteModal
          positions={combinedPositions}
          onClose={() => setShowInvite(false)}
          isPrivileged={isPrivileged}
        />
      )}

      {/* Szerkesztő modal */}
      {editingStaff && (
        <EditStaffModal
          member={editingStaff}
          positions={combinedPositions}
          isPrivileged={isPrivileged}
          currentUserRole={currentUserRole}
          sites={sites}
          onClose={() => setEditingStaff(null)}
          onSaved={(updated) => {
            setLocalStaff((prev) => prev.map((u) => u.id === updated.id ? { ...u, ...updated } : u))
            setEditingStaff(null)
          }}
        />
      )}
    </div>
  )
}
