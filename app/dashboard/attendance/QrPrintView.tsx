'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Printer, QrCode, Download, RefreshCw } from 'lucide-react'
import { refreshClockToken } from '@/app/actions/attendance'

interface Props {
  qrDataUrl: string
  companyName: string
  siteName?: string
  clockUrl: string
  canRefresh?: boolean
  siteId?: string
}

export function QrPrintView({ qrDataUrl, companyName, siteName, clockUrl, canRefresh = false, siteId }: Props) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [confirmRefresh, setConfirmRefresh] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(clockUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleRefresh() {
    setRefreshing(true)
    await refreshClockToken(siteId)
    setConfirmRefresh(false)
    setRefreshing(false)
    router.refresh()
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <style dangerouslySetInnerHTML={{ __html: `
        .qr-print-only { display: none; }
        .qr-screen-only { display: flex; }
        @media print {
          @page { margin: 0; size: A4 portrait; }
          body * { visibility: hidden; }
          body { margin: 0; background: white; }
          .qr-print-only {
            visibility: visible;
            display: flex !important;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            gap: 32px;
            padding: 60px 40px;
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
          }
          .qr-print-only * { visibility: visible; }
          .qr-print-only img { width: 280px; height: 280px; }
          .qr-print-only .qr-company { font-size: 2rem; font-weight: 700; color: #000; margin: 0; }
          .qr-print-only .qr-site { font-size: 1.25rem; color: #555; margin: 0; }
          .qr-print-only .qr-instruction { font-size: 1.1rem; color: #333; max-width: 380px; line-height: 1.6; margin: 0; }
        }
      ` }} />
      {/* Nyomtatási nézet */}
      <div className="qr-print-only">
        <img src={qrDataUrl} alt="QR kód" />
        <p className="qr-company">{companyName}</p>
        {siteName && <p className="qr-site">{siteName}</p>}
        <p className="qr-instruction">Olvasd be minden műszak elején és végén a be- és kijelentkezéshez.</p>
      </div>

      {/* Képernyős nézet */}
      <div className="qr-screen-only flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* QR kód */}
          <div className="flex-shrink-0">
            <img src={qrDataUrl} alt="QR kód" className="w-36 h-36 rounded-xl border border-gray-100" />
          </div>

          {/* Leírás */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <QrCode className="h-4 w-4 text-[#1a5c3a]" />
              <p className="text-xs font-semibold text-[#1a5c3a] uppercase tracking-wider">QR-kód a helyszínre</p>
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-0.5">{companyName}</h2>
            {siteName && <p className="text-sm text-gray-500 mb-2">{siteName}</p>}
            <p className="text-sm text-gray-500">
              Nyomtasd ki és ragaszd ki a munkahelyen. A dolgozók ezt a QR-kódot olvassák be telefonjukkal a be- és kijelentkezéshez.
            </p>
          </div>

          {/* Gombok */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-[#1a5c3a] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#1a5c3a]/90 transition-colors"
            >
              <Printer className="h-4 w-4" />
              Nyomtatás
            </button>
            <a
              href={qrDataUrl}
              download="shiftassist-qr.png"
              className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              <Download className="h-4 w-4" />
              Letöltés
            </a>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              {copied ? '✓ Másolva' : 'Link másolása'}
            </button>
            {canRefresh && !confirmRefresh && (
              <button
                onClick={() => setConfirmRefresh(true)}
                className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                QR csere
              </button>
            )}
            {canRefresh && confirmRefresh && (
              <div className="flex gap-2">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="flex-1 bg-red-600 text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  {refreshing ? '...' : 'Igen, csere'}
                </button>
                <button
                  onClick={() => setConfirmRefresh(false)}
                  className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-xs font-medium hover:bg-gray-200"
                >
                  Mégse
                </button>
              </div>
            )}
          </div>
        </div>
    </div>
  )
}
