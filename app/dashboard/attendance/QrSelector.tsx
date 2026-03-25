'use client'

import { useState } from 'react'
import { QrPrintView } from './QrPrintView'

interface QrOption {
  label: string
  qrDataUrl: string
  companyName: string
  siteName?: string
  clockUrl: string
  siteId?: string
  canRefresh: boolean
}

interface Props {
  options: QrOption[]
}

export function QrSelector({ options }: Props) {
  const [selected, setSelected] = useState(0)

  if (options.length === 0) return null

  const current = options[selected]

  return (
    <div className="space-y-3">
      {options.length > 1 && (
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">QR kód:</label>
          <select
            value={selected}
            onChange={e => setSelected(Number(e.target.value))}
            className="flex-1 max-w-xs border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#1a5c3a]/30"
          >
            {options.map((o, i) => (
              <option key={i} value={i}>{o.label}</option>
            ))}
          </select>
        </div>
      )}
      <QrPrintView
        qrDataUrl={current.qrDataUrl}
        companyName={current.companyName}
        siteName={current.siteName}
        clockUrl={current.clockUrl}
        canRefresh={current.canRefresh}
        siteId={current.siteId}
      />
    </div>
  )
}
