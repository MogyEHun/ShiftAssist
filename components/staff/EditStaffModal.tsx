'use client'

import { useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { updateStaff } from '@/app/actions/staff'
import { setUserSite } from '@/app/actions/sites'
import type { SiteWithCount } from '@/app/actions/sites'
import { useTranslation } from '@/components/providers/LanguageProvider'

interface StaffMember {
  id: string
  full_name: string
  position: string | null
  hourly_rate: number | null
  daily_rate?: number | null
  pay_type?: 'hourly' | 'daily' | null
  role: string
  site_id?: string | null
}

interface Position { id: string; name: string }

interface Props {
  member: StaffMember
  positions: Position[]
  isPrivileged: boolean
  currentUserRole?: string
  sites?: SiteWithCount[]
  onClose: () => void
  onSaved: (updated: Partial<StaffMember>) => void
}

const CUSTOM = '__custom__'

export function EditStaffModal({ member, positions, isPrivileged, currentUserRole, sites = [], onClose, onSaved }: Props) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [role, setRole] = useState<string>(member.role)
  const canEditRole = currentUserRole === 'owner' && member.role !== 'owner'
  const canEditSite = ['owner', 'admin'].includes(currentUserRole ?? '') && sites.length > 0
  const [selectedSiteId, setSelectedSiteId] = useState<string>(member.site_id ?? '')

  const [payType, setPayType] = useState<'hourly' | 'daily'>(member.pay_type ?? 'hourly')
  const [payTypeChanged, setPayTypeChanged] = useState(false)

  const initialIsCustom = !!member.position && !positions.some(p => p.name === member.position)
  const [selectValue, setSelectValue] = useState(
    member.position
      ? (positions.some(p => p.name === member.position) ? member.position : CUSTOM)
      : ''
  )
  const [customValue, setCustomValue] = useState(initialIsCustom ? (member.position ?? '') : '')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    // Ha egyéni pozíció van kiválasztva, felülírjuk a hidden mezőt
    const resolvedPosition = selectValue === CUSTOM ? customValue.trim() : selectValue
    formData.set('position', resolvedPosition)
    if (canEditRole) formData.set('role', role)

    try {
      const result = await updateStaff(member.id, formData)
      if (result?.error) {
        setError(result.error)
      } else {
        if (canEditSite) {
          const siteResult = await setUserSite(member.id, selectedSiteId || null)
          if (siteResult?.error) { setError(siteResult.error); setLoading(false); return }
        }
        onSaved({
          id: member.id,
          full_name: formData.get('fullName') as string,
          position: resolvedPosition || null,
          role: canEditRole ? role : member.role,
          hourly_rate: isPrivileged && formData.get('hourlyRate')
            ? parseFloat(formData.get('hourlyRate') as string)
            : member.hourly_rate,
          site_id: canEditSite ? (selectedSiteId || null) : member.site_id,
        })
      }
    } catch {
      setError(t('common.unknownError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{t('staff.editTitle')}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <Input
            label={t('staff.fullName')}
            name="fullName"
            defaultValue={member.full_name}
            required
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">{t('staff.colPosition')}</label>
            <select
              value={selectValue}
              onChange={e => {
                setSelectValue(e.target.value)
                if (e.target.value !== CUSTOM) setCustomValue('')
              }}
              className="rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#1a5c3a] focus:ring-2 focus:ring-[#1a5c3a]/20 bg-white"
            >
              <option value="">{t('staff.noPosition')}</option>
              {positions.map((p) => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
              <option value={CUSTOM}>{t('staff.newPosition')}</option>
            </select>

            {selectValue === CUSTOM && (
              <input
                type="text"
                value={customValue}
                onChange={e => setCustomValue(e.target.value)}
                placeholder="pl. Pincér, Pultos, Séf…"
                autoFocus
                className="mt-1 rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#1a5c3a] focus:ring-2 focus:ring-[#1a5c3a]/20"
              />
            )}
          </div>

          {canEditSite && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Telephely</label>
              <select
                value={selectedSiteId}
                onChange={e => setSelectedSiteId(e.target.value)}
                className="rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#1a5c3a] focus:ring-2 focus:ring-[#1a5c3a]/20 bg-white"
              >
                <option value="">— Nincs telephely —</option>
                {sites.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          {canEditRole && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">{t('staff.colRole')}</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#1a5c3a] focus:ring-2 focus:ring-[#1a5c3a]/20 bg-white"
              >
                <option value="employee">{t('roles.employee')}</option>
                <option value="manager">{t('roles.manager')}</option>
              </select>
            </div>
          )}

          {isPrivileged && (
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('staff.payType')}</label>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
                  <button
                    type="button"
                    onClick={() => { setPayType('hourly'); setPayTypeChanged(member.pay_type !== 'hourly') }}
                    className={`flex-1 px-3 py-2 transition-colors ${payType === 'hourly' ? 'bg-[#1a5c3a] text-white font-medium' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    {t('staff.hourly')}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPayType('daily'); setPayTypeChanged(member.pay_type !== 'daily') }}
                    className={`flex-1 px-3 py-2 transition-colors ${payType === 'daily' ? 'bg-[#1a5c3a] text-white font-medium' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    {t('staff.daily')}
                  </button>
                </div>
                <input type="hidden" name="payType" value={payType} />
              </div>

              {payTypeChanged && (
                <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">{t('staff.payTypeWarning')}</p>
                </div>
              )}

              {payType === 'hourly' ? (
                <Input
                  label={t('staff.hourlyRate')}
                  name="hourlyRate"
                  type="number"
                  defaultValue={member.hourly_rate ?? ''}
                  placeholder="pl. 1800"
                  min={0}
                />
              ) : (
                <Input
                  label={t('staff.dailyRate')}
                  name="dailyRate"
                  type="number"
                  defaultValue={member.daily_rate ?? ''}
                  placeholder="pl. 14400"
                  min={0}
                />
              )}
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-3 mt-2">
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={loading} className="flex-1">
              {t('common.save')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
