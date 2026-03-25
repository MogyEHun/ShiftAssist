'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { resetPassword } from '@/app/actions/auth'

export default function ResetPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)

    try {
      const result = await resetPassword(formData)
      if (result?.error) {
        setError(result.error)
      }
    } catch {
      // Sikeres reset esetén a server action redirect-el /dashboard-ra
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Új jelszó beállítása</h1>
        <p className="mt-1 text-sm text-gray-500">
          Add meg az új jelszavadat.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Új jelszó"
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

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <Button type="submit" loading={loading} fullWidth className="mt-2">
          Jelszó mentése
        </Button>
      </form>
    </>
  )
}
