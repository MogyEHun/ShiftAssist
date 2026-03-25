'use client'

import { useRouter, useSearchParams } from 'next/navigation'

interface Site { id: string; name: string }

export function DashboardSiteFilter({ sites, currentSiteId }: { sites: Site[]; currentSiteId: string | null }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  if (sites.length === 0) return null

  function handleChange(siteId: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (siteId) params.set('siteId', siteId)
    else params.delete('siteId')
    router.push(`/dashboard?${params.toString()}`)
  }

  return (
    <select
      value={currentSiteId ?? ''}
      onChange={e => handleChange(e.target.value)}
      className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#1a5c3a]/20 focus:border-[#1a5c3a]"
    >
      <option value="">Minden telephely</option>
      {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
    </select>
  )
}
