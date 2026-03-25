'use client'

import { useEffect } from 'react'

export default function MyError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[/my error]', error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-red-100 p-6 text-center shadow-sm">
        <h2 className="text-lg font-bold text-red-700 mb-2">Hiba történt</h2>
        <p className="text-sm text-gray-600 mb-4">{error.message}</p>
        {error.digest && (
          <p className="text-xs text-gray-400 mb-4 font-mono">Digest: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="px-4 py-2 bg-[#1a5c3a] text-white rounded-xl text-sm font-medium hover:bg-[#1a5c3a]/90"
        >
          Újrapróbálkozás
        </button>
      </div>
    </div>
  )
}
