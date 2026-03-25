'use client'

import { useEffect, useState } from 'react'
import { Bell, X } from 'lucide-react'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return new Uint8Array(Array.from(rawData).map((c) => c.charCodeAt(0)))
}

export function PushPermission() {
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return
    if (Notification.permission === 'default') {
      // Kis késleltetés, hogy ne azonnal jelenjek meg
      const t = setTimeout(() => setShow(true), 3000)
      return () => clearTimeout(t)
    }
  }, [])

  const handleAllow = async () => {
    setLoading(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setShow(false)
        return
      }

      const reg = await navigator.serviceWorker.ready
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
      })

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      })

      setShow(false)
    } catch (err) {
      console.error('Push feliratkozás hiba:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!show) return null

  return (
    <div className="fixed top-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-80">
      <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-4">
        <div className="flex gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#1a5c3a]/10 flex items-center justify-center flex-shrink-0">
            <Bell className="h-5 w-5 text-[#1a5c3a]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">Értesítések bekapcsolása</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
              Értesítést kaphatsz új műszakokról, szabadság jóváhagyásáról és csereajánlatokról.
            </p>
          </div>
          <button
            onClick={() => setShow(false)}
            className="flex-shrink-0 p-1 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Bezárás"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleAllow}
            disabled={loading}
            className="flex-1 bg-[#1a5c3a] text-white text-sm font-medium py-2 rounded-lg hover:bg-[#154d30] transition-colors disabled:opacity-50"
          >
            {loading ? 'Folyamatban...' : 'Engedélyezés'}
          </button>
          <button
            onClick={() => setShow(false)}
            className="px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Később
          </button>
        </div>
      </div>
    </div>
  )
}
