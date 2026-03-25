'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'

export function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent')
    if (!consent) setVisible(true)
  }, [])

  function accept() {
    localStorage.setItem('cookie_consent', 'accepted')
    setVisible(false)
  }

  function necessary() {
    localStorage.setItem('cookie_consent', 'necessary')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-200 p-4 md:p-5">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900 mb-1">Sütihasználat</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              A ShiftAssist csak szükséges sütiket használ a bejelentkezés és biztonság érdekében.
              Harmadik feles nyomkövető sütit <strong>nem</strong> alkalmazunk.{' '}
              <Link href="/privacy" className="text-[#1a5c3a] hover:underline">Adatvédelmi tájékoztató</Link>
            </p>
          </div>
          <button
            onClick={necessary}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
            aria-label="Bezárás"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        <div className="flex gap-2 mt-3 justify-end">
          <button
            onClick={necessary}
            className="px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs hover:bg-gray-50 transition-colors"
          >
            Csak szükséges
          </button>
          <button
            onClick={accept}
            className="px-4 py-1.5 bg-[#1a5c3a] text-white rounded-lg text-xs font-medium hover:bg-[#1a5c3a]/90 transition-colors"
          >
            Elfogadom
          </button>
        </div>
      </div>
    </div>
  )
}
