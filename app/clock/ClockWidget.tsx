'use client'

import { useState, useEffect } from 'react'
import { clockIn, clockOut } from '@/app/actions/attendance'
import { CheckCircle2, LogIn, LogOut, AlertCircle, MapPin } from 'lucide-react'

interface Props {
  token: string
  isClockedIn: boolean
  clockInAt: string | null
  userName: string
  error?: string
}

function formatElapsed(clockInAt: string): string {
  const diff = Math.floor((Date.now() - new Date(clockInAt).getTime()) / 1000)
  const h = Math.floor(diff / 3600)
  const m = Math.floor((diff % 3600) / 60)
  const s = diff % 60
  if (h > 0) return `${h}ó ${m}p`
  return `${m}p ${s.toString().padStart(2, '0')}s`
}

const ERROR_MESSAGES: Record<string, string> = {
  invalidToken: 'Érvénytelen QR-kód.',
  notSameCompany: 'Ez a QR-kód nem a te cégedhez tartozik.',
  alreadyClockedInError: 'Már be vagy jelentkezve.',
  noOpenEntry: 'Nincs nyitott bejelentkezés.',
}

export function ClockWidget({ token, isClockedIn: initialClockedIn, clockInAt: initialClockInAt, userName, error: initialError }: Props) {
  const [isClockedIn, setIsClockedIn] = useState(initialClockedIn)
  const [clockInAt, setClockInAt] = useState<string | null>(initialClockInAt)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [elapsed, setElapsed] = useState('')
  const [locationOk, setLocationOk] = useState(false)

  useEffect(() => {
    if (!isClockedIn || !clockInAt) { setElapsed(''); return }
    const update = () => setElapsed(formatElapsed(clockInAt))
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [isClockedIn, clockInAt])

  async function getCoords(): Promise<{ lat: number; lon: number } | undefined> {
    if (!navigator.geolocation) return undefined
    return new Promise(resolve => {
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => resolve(undefined),
        { timeout: 5000 }
      )
    })
  }

  async function handleClock() {
    setLoading(true)
    setMessage(null)
    setLocationOk(false)
    try {
      const coords = await getCoords()
      if (coords) setLocationOk(true)

      if (isClockedIn) {
        const res = await clockOut(token, coords)
        if (res.error) {
          setMessage({ type: 'error', text: ERROR_MESSAGES[res.error] ?? res.error })
        } else {
          setIsClockedIn(false)
          setClockInAt(null)
          setMessage({ type: 'success', text: 'Sikeresen kijelentkeztél!' })
        }
      } else {
        const res = await clockIn(token, coords)
        if (res.error) {
          setMessage({ type: 'error', text: ERROR_MESSAGES[res.error] ?? res.error })
        } else {
          const now = new Date().toISOString()
          setIsClockedIn(true)
          setClockInAt(now)
          setMessage({ type: 'success', text: 'Sikeresen bejelentkeztél!' })
        }
      }
    } finally {
      setLoading(false)
    }
  }

  if (initialError && !isClockedIn) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-sm w-full text-center">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
        <p className="text-gray-600 text-sm">{ERROR_MESSAGES[initialError] ?? initialError}</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-sm w-full">
      {/* Üdvözlés */}
      <div className="text-center mb-8">
        <p className="text-gray-500 text-sm mb-1">Szia,</p>
        <h1 className="text-2xl font-bold text-gray-900">{userName || '—'}</h1>
      </div>

      {/* Státusz */}
      <div className={`rounded-xl p-4 mb-6 text-center transition-colors ${
        isClockedIn ? 'bg-[#1a5c3a]/10' : 'bg-gray-100'
      }`}>
        <div className="flex items-center justify-center gap-2 mb-1">
          {isClockedIn && (
            <span className="h-2 w-2 rounded-full bg-[#1a5c3a] animate-pulse" />
          )}
          <p className={`font-semibold text-sm ${isClockedIn ? 'text-[#1a5c3a]' : 'text-gray-500'}`}>
            {isClockedIn ? 'Jelenleg bent vagy' : 'Még nem jelentkeztél be'}
          </p>
        </div>
        {isClockedIn && elapsed && (
          <p className="text-xs text-[#1a5c3a]/70 font-mono">{elapsed}</p>
        )}
      </div>

      {/* Gomb */}
      <button
        onClick={handleClock}
        disabled={loading}
        className={`w-full py-4 rounded-xl font-semibold text-white text-base transition-all flex items-center justify-center gap-2 ${
          loading ? 'opacity-60 cursor-not-allowed' :
          isClockedIn
            ? 'bg-red-500 hover:bg-red-600 active:scale-95'
            : 'bg-[#1a5c3a] hover:bg-[#1a5c3a]/90 active:scale-95'
        }`}
      >
        {loading ? (
          <span className="h-5 w-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        ) : isClockedIn ? (
          <><LogOut className="h-5 w-5" /> Kijelentkezés</>
        ) : (
          <><LogIn className="h-5 w-5" /> Bejelentkezés</>
        )}
      </button>

      {/* Üzenet */}
      {message && (
        <div className={`mt-4 flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${
          message.type === 'success' ? 'bg-[#1a5c3a]/10 text-[#1a5c3a]' : 'bg-red-50 text-red-600'
        }`}>
          {message.type === 'success' && <CheckCircle2 className="h-4 w-4 flex-shrink-0" />}
          {message.type === 'error' && <AlertCircle className="h-4 w-4 flex-shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {locationOk && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
          <MapPin className="h-3.5 w-3.5" />
          <span>Helyszín rögzítve</span>
        </div>
      )}
    </div>
  )
}
