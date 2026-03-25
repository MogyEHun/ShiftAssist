'use client'

import { Shield } from 'lucide-react'

interface ImpersonationBannerProps {
  companyName: string
}

export function ImpersonationBanner({ companyName }: ImpersonationBannerProps) {
  return (
    <div className="w-full bg-amber-400 text-amber-900 px-4 py-2 flex items-center justify-between gap-4 text-sm font-medium z-50 sticky top-0">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 flex-shrink-0" />
        <span>Super Admin nézet: <strong>{companyName}</strong></span>
      </div>
      <form action="/api/super-admin/exit-impersonate" method="POST">
        <button
          type="submit"
          className="px-3 py-1 bg-amber-900 text-amber-50 rounded-lg text-xs font-semibold hover:bg-amber-800 transition-colors"
        >
          Kilépés
        </button>
      </form>
    </div>
  )
}
