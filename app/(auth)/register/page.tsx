'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { register } from '@/app/actions/auth'

export default function RegisterPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)

    try {
      const result = await register(formData)
      if (result?.error) {
        setError(result.error)
      }
    } catch {
      // Sikeres regisztráció esetén a server action redirect-el
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Regisztráció</h1>
        <p className="mt-1 text-sm text-gray-500">
          Hozd létre a vállalkozásod fiókját. 14 nap ingyenes próbaidőszak!
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Vállalkozás neve */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
            Vállalkozás adatai
          </p>
          <Input
            label="Vállalkozás neve"
            name="companyName"
            type="text"
            placeholder="pl. Bistro Pest"
            autoComplete="organization"
            required
          />
        </div>

        {/* Személyes adatok */}
        <div className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Személyes adatok
          </p>
          <Input
            label="Teljes név"
            name="fullName"
            type="text"
            placeholder="pl. Kovács Anna"
            autoComplete="name"
            required
          />
          <Input
            label="Email cím"
            name="email"
            type="email"
            placeholder="pelda@email.hu"
            autoComplete="email"
            required
          />
        </div>

        {/* Jelszó */}
        <div className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Jelszó
          </p>
          <Input
            label="Jelszó"
            name="password"
            type="password"
            placeholder="Min. 8 karakter"
            autoComplete="new-password"
            required
            minLength={8}
          />
          <Input
            label="Jelszó megerősítése"
            name="passwordConfirm"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            required
          />
        </div>

        {/* Hibaüzenet */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <Button type="submit" loading={loading} fullWidth className="mt-2">
          Fiók létrehozása
        </Button>

        <p className="text-xs text-center text-gray-400">
          A regisztrációval elfogadod az{' '}
          <span className="text-[#1a5c3a] cursor-pointer hover:underline">
            Általános Szerződési Feltételeket
          </span>
          .
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Már van fiókod?{' '}
        <Link href="/login" className="text-[#1a5c3a] font-semibold hover:underline">
          Jelentkezz be
        </Link>
      </p>
    </>
  )
}
