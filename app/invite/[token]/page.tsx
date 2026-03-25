'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CalendarDays, CheckCircle2 } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
// Meghívó elfogadása oldal — token alapján
export default function InvitePage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [invitation, setInvitation] = useState<{
    email: string
    role: string
    company_name: string
    position_name: string | null
    expires_at: string
    accepted_at: string | null
  } | null>(null)

  useEffect(() => {
    async function loadInvitation() {
      try {
        const res = await fetch(`/api/invite/${token}`)
        const data = await res.json()
        if (!res.ok || data.error) {
          setError(data.error ?? 'Érvénytelen vagy lejárt meghívó.')
        } else {
          setInvitation(data)
        }
      } catch {
        setError('Nem sikerült betölteni a meghívót. Ellenőrizd a hivatkozást.')
      } finally {
        setLoading(false)
      }
    }
    loadInvitation()
  }, [token])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const fullName = formData.get('fullName') as string
    const password = formData.get('password') as string
    const passwordConfirm = formData.get('passwordConfirm') as string

    if (password.length < 8) { setError('A jelszónak legalább 8 karakter hosszúnak kell lennie.'); setSubmitting(false); return }
    if (password !== passwordConfirm) { setError('A két jelszó nem egyezik.'); setSubmitting(false); return }

    const res = await fetch(`/api/invite/${token}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, password }),
    })

    const data = await res.json()
    if (data.error) {
      setError(data.error)
      setSubmitting(false)
    } else {
      // Bejelentkezés a regisztráció után (email_confirm: true, nincs verify-email szükséges)
      const supabase = createClient()
      const { data: signInData } = await supabase.auth.signInWithPassword({ email: invitation!.email, password })
      const role = signInData?.user?.user_metadata?.role
      router.push(role === 'employee' ? '/my' : '/dashboard')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-[#1a5c3a] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
          <p className="text-red-600 font-medium">{error}</p>
          <a href="/login" className="mt-4 inline-block text-sm text-[#1a5c3a] hover:underline">
            Vissza a bejelentkezéshez
          </a>
        </div>
      </div>
    )
  }

  if (invitation?.accepted_at) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900">Ez a meghívó már felhasználták</h2>
          <a href="/login" className="mt-4 inline-block text-sm text-[#1a5c3a] hover:underline">
            Bejelentkezés
          </a>
        </div>
      </div>
    )
  }

  const roleLabel = invitation?.role === 'manager' ? 'Vezető' : 'Dolgozó'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 flex items-center gap-2">
        <div className="h-9 w-9 rounded-xl bg-[#1a5c3a] flex items-center justify-center">
          <CalendarDays className="h-5 w-5 text-white" />
        </div>
        <span className="text-2xl font-bold text-gray-900">ShiftAssist</span>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="mb-6 p-4 bg-[#1a5c3a]/5 rounded-xl">
          <p className="text-sm text-gray-600">
            Meghívtak a <strong className="text-[#1a5c3a]">{invitation?.company_name}</strong> csapatába
            {invitation?.position_name && <> — <strong>{invitation.position_name}</strong> pozícióra</>}
            {' '}({roleLabel} szerepkörrel).
          </p>
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-1">Regisztráció</h1>
        <p className="text-sm text-gray-500 mb-6">Add meg az adataidat a csatlakozáshoz.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Email cím"
            value={invitation?.email ?? ''}
            disabled
            className="bg-gray-50"
          />
          <Input label="Teljes nev" name="fullName" required placeholder="pl. Kiss Péter" />
          <Input label="Jelszó" name="password" type="password" required minLength={8} placeholder="Min. 8 karakter" />
          <Input label="Jelszó megerősítése" name="passwordConfirm" type="password" required placeholder="••••••••" />

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <Button type="submit" loading={submitting} fullWidth className="mt-2">
            Csatlakozás a csapathoz
          </Button>
        </form>
      </div>
    </div>
  )
}
