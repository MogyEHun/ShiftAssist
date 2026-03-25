'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { forgotPassword } from '@/app/actions/auth'

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)

    try {
      const result = await forgotPassword(formData)
      if (result?.error) {
        setError(result.error)
      } else if (result?.success) {
        setSent(true)
      }
    } catch {
      setError('Ismeretlen hiba történt. Próbáld újra.')
    } finally {
      setLoading(false)
    }
  }

  // Email elküldve állapot
  if (sent) {
    return (
      <div className="flex flex-col items-center text-center gap-4">
        <div className="h-14 w-14 rounded-full bg-[#1a5c3a]/10 flex items-center justify-center">
          <svg className="h-7 w-7 text-[#1a5c3a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Email elküldve!</h2>
          <p className="mt-2 text-sm text-gray-500">
            Ha létezik fiók ezzel az email címmel, hamarosan megérkezik a jelszó visszaállítási link.
          </p>
        </div>
        <Link href="/login" className="text-sm text-[#1a5c3a] font-semibold hover:underline">
          Vissza a bejelentkezéshez
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Elfelejtett jelszó</h1>
        <p className="mt-1 text-sm text-gray-500">
          Add meg az email címed és küldünk egy visszaállítási linket.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Email cím"
          name="email"
          type="email"
          placeholder="pelda@email.hu"
          autoComplete="email"
          required
        />

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <Button type="submit" loading={loading} fullWidth className="mt-2">
          Visszaállítási link küldése
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        <Link href="/login" className="text-[#1a5c3a] font-semibold hover:underline">
          ← Vissza a bejelentkezéshez
        </Link>
      </p>
    </>
  )
}
