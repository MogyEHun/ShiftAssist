'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, Users, Check, X, MapPin, UserCheck, Search } from 'lucide-react'
import { createSite, updateSite, deleteSite, setUserSite, SiteWithCount } from '@/app/actions/sites'
import { useTranslation } from '@/components/providers/LanguageProvider'

interface Employee { id: string; full_name: string; site_id: string | null; role: string }

interface Props {
  initialSites: SiteWithCount[]
  employees: Employee[]
}

export function SitesClient({ initialSites, employees }: Props) {
  const { t } = useTranslation()
  const [sites, setSites] = useState(initialSites)
  const [empList, setEmpList] = useState(employees)
  const [newName, setNewName] = useState('')
  const [newAddress, setNewAddress] = useState('')
  const [newManagerId, setNewManagerId] = useState('')
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editManagerId, setEditManagerId] = useState('')
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [empSearch, setEmpSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const managers = employees.filter(e => ['owner', 'admin', 'manager'].includes(e.role))

  async function handleCreate() {
    if (!newName.trim()) return
    setSaving(true)
    setError(null)
    const result = await createSite(newName.trim(), newAddress.trim() || null, newManagerId || null)
    setSaving(false)
    if (result.error) { setError(result.error); return }
    if (result.data) {
      const managerName = newManagerId ? (employees.find(e => e.id === newManagerId)?.full_name ?? null) : null
      setSites(prev => [...prev, { ...result.data!, employee_count: 0, manager_name: managerName }])
      setNewName('')
      setNewAddress('')
      setNewManagerId('')
      setCreating(false)
    }
  }

  async function handleUpdate(id: string) {
    setSaving(true)
    setError(null)
    const result = await updateSite(id, editName, editAddress.trim() || null, editManagerId || null)
    setSaving(false)
    if (result.error) { setError(result.error); return }
    const managerName = editManagerId ? (employees.find(e => e.id === editManagerId)?.full_name ?? null) : null
    setSites(prev => prev.map(s => s.id === id
      ? { ...s, name: editName, address: editAddress || null, manager_id: editManagerId || null, manager_name: managerName }
      : s
    ))
    setEditingId(null)
  }

  async function handleDelete(id: string) {
    if (!confirm(t('settings.siteConfirmDelete'))) return
    setError(null)
    const result = await deleteSite(id)
    if (result.error) { setError(result.error); return }
    setSites(prev => prev.filter(s => s.id !== id))
  }

  async function handleAssignEmployee(empId: string, siteId: string | null) {
    setSaving(true)
    const result = await setUserSite(empId, siteId)
    setSaving(false)
    if (result.error) { setError(result.error); return }

    setEmpList(prev => prev.map(e => e.id === empId ? { ...e, site_id: siteId } : e))

    setSites(prev => prev.map(s => {
      const count = empList
        .map(e => e.id === empId ? { ...e, site_id: siteId } : e)
        .filter(e => e.site_id === s.id).length
      return { ...s, employee_count: count }
    }))
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="px-4 py-3 bg-red-50 text-red-700 text-sm rounded-xl">{error}</div>
      )}

      {sites.map(site => (
        <div key={site.id} className="bg-white border border-gray-100 rounded-2xl p-4">
          {editingId === site.id ? (
            <div className="space-y-3">
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder={t('settings.siteNamePlaceholder')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none"
              />
              <input
                value={editAddress}
                onChange={e => setEditAddress(e.target.value)}
                placeholder={t('settings.siteAddressPlaceholder')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none"
              />
              {managers.length > 0 && (
                <select
                  value={editManagerId}
                  onChange={e => setEditManagerId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none bg-white"
                >
                  <option value="">{t('settings.noManager')}</option>
                  {managers.map(m => (
                    <option key={m.id} value={m.id}>{m.full_name}</option>
                  ))}
                </select>
              )}
              <div className="flex gap-2">
                <button onClick={() => setEditingId(null)} className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
                  {t('common.cancel')}
                </button>
                <button onClick={() => handleUpdate(site.id)} disabled={saving} className="flex-1 px-3 py-1.5 text-sm bg-[#1a5c3a] text-white rounded-lg hover:bg-[#15472e] disabled:opacity-50">
                  {t('common.save')}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-4 w-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{site.name}</p>
                  <p className="text-xs text-gray-400">
                    {site.address && <span className="mr-2">{site.address}</span>}
                    {site.employee_count} {t('settings.siteEmployees')}
                  </p>
                  {site.manager_name && (
                    <span className="text-xs text-indigo-600 flex items-center gap-1 mt-0.5">
                      <UserCheck className="h-3 w-3" />{site.manager_name}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => { setAssigningId(assigningId === site.id ? null : site.id); setEmpSearch('') }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  title={t('settings.siteManage')}
                >
                  <Users className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setEditingId(site.id)
                    setEditName(site.name)
                    setEditAddress(site.address ?? '')
                    setEditManagerId(site.manager_id ?? '')
                  }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(site.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {assigningId === site.id && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-2">{t('settings.siteMembers')}</p>
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  value={empSearch}
                  onChange={e => setEmpSearch(e.target.value)}
                  placeholder="Keresés..."
                  className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none"
                />
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {employees
                  .filter(e => e.full_name.toLowerCase().includes(empSearch.toLowerCase()))
                  .map(emp => {
                    const currentSiteId = empList.find(e => e.id === emp.id)?.site_id
                    const isAssigned = currentSiteId === site.id
                    return (
                      <label key={emp.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isAssigned}
                          onChange={() => handleAssignEmployee(emp.id, isAssigned ? null : site.id)}
                          disabled={saving}
                          className="rounded border-gray-300 text-[#1a5c3a] focus:ring-[#1a5c3a]"
                        />
                        <span className="text-sm text-gray-700">{emp.full_name}</span>
                        {currentSiteId && currentSiteId !== site.id && (
                          <span className="text-xs text-amber-600 ml-auto">
                            {sites.find(s => s.id === currentSiteId)?.name}
                          </span>
                        )}
                      </label>
                    )
                  })}
              </div>
              <button
                onClick={() => { setAssigningId(null); setEmpSearch('') }}
                className="mt-2 w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                {t('common.close')}
              </button>
            </div>
          )}
        </div>
      ))}

      {creating ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-4 space-y-3">
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder={t('settings.siteNamePlaceholder')}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none"
          />
          <input
            value={newAddress}
            onChange={e => setNewAddress(e.target.value)}
            placeholder={t('settings.siteAddressPlaceholder')}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none"
          />
          {managers.length > 0 && (
            <select
              value={newManagerId}
              onChange={e => setNewManagerId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none bg-white"
            >
              <option value="">{t('settings.noManager')}</option>
              {managers.map(m => (
                <option key={m.id} value={m.id}>{m.full_name}</option>
              ))}
            </select>
          )}
          <div className="flex gap-2">
            <button onClick={() => setCreating(false)} className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
              <X className="h-4 w-4 inline mr-1" />{t('common.cancel')}
            </button>
            <button onClick={handleCreate} disabled={saving || !newName.trim()} className="flex-1 px-3 py-1.5 text-sm bg-[#1a5c3a] text-white rounded-lg hover:bg-[#15472e] disabled:opacity-50">
              <Check className="h-4 w-4 inline mr-1" />{t('settings.siteCreate')}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-gray-300 rounded-2xl text-sm text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t('settings.siteNew')}
        </button>
      )}
    </div>
  )
}
