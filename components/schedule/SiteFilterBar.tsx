'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { MapPin } from 'lucide-react'
import type { Site } from '@/types'

interface Props {
  sites: Site[]
  currentSiteId: string | null  // aktív szűrő (owner/admin: URL param, manager: saját site)
  userRole: string
  userSiteId?: string | null     // a bejelentkezett user site_id-ja (manager esetén)
}

export function SiteFilterBar({ sites, currentSiteId, userRole, userSiteId }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isManagerOnly = userRole === 'manager'

  function handleChange(siteId: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (siteId) {
      params.set('siteId', siteId)
    } else {
      params.delete('siteId')
    }
    router.push(`/dashboard/schedule?${params.toString()}`)
  }

  if (isManagerOnly) {
    const site = sites.find(s => s.id === userSiteId)
    if (!site) return null
    return (
      <div className="flex items-center gap-1.5 text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg">
        <MapPin className="h-3.5 w-3.5 text-gray-400" />
        <span className="font-medium">{site.name}</span>
      </div>
    )
  }

  // owner/admin: dropdown
  return (
    <div className="flex items-center gap-2">
      <MapPin className="h-4 w-4 text-gray-400" />
      <select
        value={currentSiteId ?? ''}
        onChange={e => handleChange(e.target.value)}
        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1a5c3a]/30"
      >
        <option value="">Összes telephely</option>
        {sites.map(s => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
    </div>
  )
}
