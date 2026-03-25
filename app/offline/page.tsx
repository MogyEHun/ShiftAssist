'use client'

import { WifiOff, RefreshCw } from 'lucide-react'

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#1a5c3a] flex flex-col items-center justify-center p-6 text-white">
      <div className="flex flex-col items-center gap-6 max-w-sm text-center">
        <div className="h-20 w-20 rounded-full bg-white/10 flex items-center justify-center">
          <WifiOff className="h-10 w-10 text-white/80" />
        </div>

        <div>
          <h1 className="text-2xl font-bold mb-2">Nincs internetkapcsolat</h1>
          <p className="text-white/70 text-sm leading-relaxed">
            Az alkalmazás nem érhető el offline módban. Ellenőrizd az internetkapcsolatod és próbáld újra.
          </p>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 bg-white text-[#1a5c3a] font-semibold px-6 py-3 rounded-xl hover:bg-white/90 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Újrapróbálom
        </button>

        <div className="mt-4 flex items-center gap-2 opacity-50">
          <div className="h-6 w-6 rounded bg-white/20 flex items-center justify-center">
            <span className="text-xs font-bold">S</span>
          </div>
          <span className="text-sm font-medium">ShiftAssist</span>
        </div>
      </div>
    </div>
  )
}
