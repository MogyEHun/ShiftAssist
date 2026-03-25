'use client'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

// Statikus oldal — regisztráció után jelenik meg
export default function VerifyEmailPage() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex flex-col items-center text-center gap-4">
      {/* Ikon */}
      <div className="h-16 w-16 rounded-full bg-[#1a5c3a]/10 flex items-center justify-center">
        <svg
          className="h-8 w-8 text-[#1a5c3a]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
          />
        </svg>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ellenőrizd az emailed!</h1>
        <p className="mt-2 text-sm text-gray-500 leading-relaxed">
          Küldtünk egy megerősítő emailt a megadott email címre.
          Kattints a levélben lévő linkre a fiók aktiválásához.
        </p>
      </div>

      <div className="w-full rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-left">
        <p className="text-sm text-amber-700">
          <span className="font-semibold">Nem érkezett meg?</span> Ellenőrizd a spam mappát,
          vagy várj néhány percet.
        </p>
      </div>

      <button
        onClick={handleSignOut}
        className="mt-2 text-sm text-[#1a5c3a] font-semibold hover:underline"
      >
        Kijelentkezés
      </button>
    </div>
  )
}
