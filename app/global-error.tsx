'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <h1 className="text-4xl font-bold text-slate-800 mb-2">Hiba</h1>
            <p className="text-slate-500 mb-6">Váratlan hiba történt. Kérjük, próbáld újra.</p>
            {error.digest && (
              <p className="text-xs text-slate-400 font-mono mb-6">Digest: {error.digest}</p>
            )}
            <button
              onClick={reset}
              className="px-6 py-3 bg-[#1a5c3a] text-white font-semibold rounded-xl hover:bg-[#154d31] transition-colors"
            >
              Újrapróbálom
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
