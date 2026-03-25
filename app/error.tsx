'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="inline-flex h-20 w-20 rounded-2xl bg-red-50 items-center justify-center mb-6">
          <AlertTriangle className="h-10 w-10 text-red-400" />
        </div>
        <h1 className="text-6xl font-bold text-slate-800 mb-2">500</h1>
        <h2 className="text-xl font-semibold text-slate-700 mb-3">Szerverhiba történt</h2>
        <p className="text-slate-500 mb-4">
          Valami nem várt hiba történt. Kérjük, próbáld újra.
        </p>
        {(error.message || error.digest) && (
          <div className="bg-slate-100 rounded-xl p-4 mb-6 text-left font-mono text-xs text-slate-600 break-all">
            {error.message && <div className="mb-1"><strong>Hiba:</strong> {error.message}</div>}
            {error.digest && <div><strong>Digest:</strong> {error.digest}</div>}
          </div>
        )}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-6 py-3 bg-[#1a5c3a] text-white font-semibold rounded-xl hover:bg-[#154d31] transition-colors"
          >
            Újrapróbálom
          </button>
          <a
            href="/dashboard"
            className="px-6 py-3 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors"
          >
            Főoldal
          </a>
        </div>
      </div>
    </div>
  )
}
