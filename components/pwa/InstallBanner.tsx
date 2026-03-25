'use client'

import { useEffect, useState } from 'react'
import { X, Download } from 'lucide-react'

const DISMISSED_KEY = 'shiftsync_install_dismissed'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIosBanner, setShowIosBanner] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY)) return

    // Csak mobilon jelenjen meg (max 768px szélesség)
    if (window.innerWidth >= 768) return

    // Android / Chrome: beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // iOS Safari detektálás
    const isIos =
      /iphone|ipad|ipod/i.test(navigator.userAgent) &&
      !(navigator as unknown as { standalone?: boolean }).standalone
    if (isIos) {
      setShowIosBanner(true)
      setVisible(true)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') dismiss()
    setDeferredPrompt(null)
  }

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-[#1a5c3a] text-white shadow-lg safe-area-bottom">
      <div className="flex items-center gap-3 max-w-lg mx-auto">
        <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
          <Download className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Telepítsd a ShiftAssist-et!</p>
          {showIosBanner ? (
            <p className="text-xs text-white/70 mt-0.5">
              Nyomd a <strong>Megosztás</strong> ikont, majd "Főképernyőre adom"
            </p>
          ) : (
            <p className="text-xs text-white/70 mt-0.5">
              Tedd a főképernyőre az appot – gyors elérés, offline mód
            </p>
          )}
        </div>
        {!showIosBanner && (
          <button
            onClick={handleInstall}
            className="flex-shrink-0 bg-[#d4a017] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#b8860f] transition-colors"
          >
            Telepítés
          </button>
        )}
        <button
          onClick={dismiss}
          className="flex-shrink-0 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Bezárás"
        >
          <X className="h-4 w-4 text-white/70" />
        </button>
      </div>
    </div>
  )
}
