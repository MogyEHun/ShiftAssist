'use client'

import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

export function GracePeriodBanner() {
  return (
    <div className="bg-red-50 border-b border-red-200 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center gap-3">
        <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
        <p className="text-sm text-red-800 flex-1">
          <strong>Fizetési probléma:</strong> Az előfizetési díj befizetése sikertelen volt.
          Kérjük frissítsd a fizetési adataidat, különben a hozzáférés hamarosan felfüggesztésre kerül.
        </p>
        <Link
          href="/dashboard/billing"
          className="flex-shrink-0 text-sm font-medium text-red-700 underline hover:text-red-900"
        >
          Számlázás kezelése
        </Link>
      </div>
    </div>
  )
}
