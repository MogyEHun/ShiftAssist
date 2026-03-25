'use client'

import { useState, useRef } from 'react'
import { verify2FALogin } from '@/app/actions/two-factor'
import { Shield, AlertCircle } from 'lucide-react'

export default function TwoFactorVerifyPage() {
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token.trim()) return
    setLoading(true)
    setError(null)
    const result = await verify2FALogin(token.trim())
    if (result?.error) {
      setError(result.error)
      setToken('')
      inputRef.current?.focus()
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-sm p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-full bg-[#1a5c3a]/10 flex items-center justify-center mb-3">
            <Shield className="h-6 w-6 text-[#1a5c3a]" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900">Kétlépéses azonosítás</h1>
          <p className="text-sm text-gray-500 text-center mt-1">
            Add meg az authenticator alkalmazásodban látható 6 jegyű kódot, vagy egy biztonsági kódot.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={token}
            onChange={e => setToken(e.target.value)}
            placeholder="000 000"
            maxLength={9}
            autoFocus
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-center text-2xl font-mono tracking-widest focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none"
          />

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || token.replace(/\s/g, '').length < 6}
            className="w-full py-2.5 bg-[#1a5c3a] text-white text-sm font-medium rounded-xl hover:bg-[#15472e] transition-colors disabled:opacity-50"
          >
            {loading ? 'Ellenőrzés...' : 'Megerősítés'}
          </button>
        </form>
      </div>
    </div>
  )
}
