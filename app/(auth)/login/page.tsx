'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { login } from '@/app/actions/auth'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const hash = window.location.hash
    if (hash.includes('type=recovery') && hash.includes('access_token=')) {
      router.replace('/reset-password' + hash)
    }
  }, [])
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)

    try {
      const result = await login(formData)
      if (result?.error) {
        if (result.error === 'email_not_confirmed') {
          setError('Kérjük erősítsd meg az email címedet a bejelentkezés előtt. Ellenőrizd a beérkező leveleid!')
        } else {
          setError(result.error)
        }
      }
    } catch {
      // Sikeres login esetén a server action redirect-el, ami exception-ként jelenik meg
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bejelentkezés</h1>
        <p className="mt-1 text-sm text-gray-500">
          Üdvözlünk vissza! Add meg az adataidat.
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
        <div className="flex flex-col gap-1">
          <Input
            label="Jelszó"
            name="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-xs text-[#1a5c3a] hover:underline"
            >
              Elfelejtett jelszó?
            </Link>
          </div>
        </div>

        {/* Hibaüzenet */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <Button type="submit" loading={loading} fullWidth className="mt-2">
          Bejelentkezés
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Még nincs fiókod?{' '}
        <Link href="/register" className="text-[#1a5c3a] font-semibold hover:underline">
          Regisztrálj ingyen
        </Link>
      </p>
    </>
  )
}
