import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ShiftAssist – Bejelentkezés',
}

// Auth oldalak közös layout — középre igazított kártya, ShiftAssist branding
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-[#1a5c3a] flex items-center justify-center">
            <svg
              className="h-5 w-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <span className="text-2xl font-bold text-gray-900">ShiftAssist</span>
        </div>
        <p className="text-sm text-gray-500">Vendéglátós beosztáskezelő</p>
      </div>

      {/* Tartalom kártya */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        {children}
      </div>

      {/* Footer */}
      <p className="mt-6 text-xs text-gray-400">
        © {new Date().getFullYear()} ShiftAssist. Minden jog fenntartva.
      </p>
    </div>
  )
}
