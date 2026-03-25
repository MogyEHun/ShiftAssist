'use client'

import { useState } from 'react'
import { X, Send, Link2, Copy, Check } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { inviteStaff, generateInviteLink } from '@/app/actions/staff'

interface Position { id: string; name: string }

interface Props {
  positions: Position[]
  isPrivileged: boolean
  onClose: () => void
}

export function InviteModal({ positions, isPrivileged, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [linkLoading, setLinkLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    try {
      const result = await inviteStaff(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        setSuccess(true)
      }
    } catch {
      setError('Ismeretlen hiba történt.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerateLink(e: React.MouseEvent<HTMLButtonElement>) {
    const form = (e.currentTarget as HTMLElement).closest('form') as HTMLFormElement
    if (!form) return
    setError(null)
    setLinkLoading(true)
    const formData = new FormData(form)
    const email = formData.get('email') as string
    const role = formData.get('role') as 'manager' | 'employee'
    try {
      const result = await generateInviteLink(email, role)
      if (result?.error) {
        setError(result.error)
      } else if (result?.inviteUrl) {
        // Fix origin in case NEXT_PUBLIC_APP_URL port differs from dev server port
        try {
          const parsed = new URL(result.inviteUrl)
          parsed.protocol = window.location.protocol
          parsed.host = window.location.host
          setInviteUrl(parsed.toString())
        } catch {
          setInviteUrl(result.inviteUrl)
        }
      }
    } catch {
      setError('Ismeretlen hiba történt.')
    } finally {
      setLinkLoading(false)
    }
  }

  async function copyLink() {
    if (!inviteUrl) return
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Dolgozó meghívása</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        {success ? (
          <div className="p-6 flex flex-col items-center text-center gap-4">
            <div className="h-14 w-14 rounded-full bg-green-50 flex items-center justify-center">
              <Send className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Meghívó elküldve!</p>
              <p className="text-sm text-gray-500 mt-1">A dolgozó emailben kapott egy meghívó linket.</p>
            </div>
            <Button variant="ghost" onClick={onClose}>Bezárás</Button>
          </div>
        ) : inviteUrl ? (
          <div className="p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Link2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Meghívó link generálva</p>
                <p className="text-xs text-gray-500">Másold ki és küldd el a dolgozónak</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2 border border-gray-200">
              <p className="text-xs text-gray-600 flex-1 break-all font-mono">{inviteUrl}</p>
              <button
                onClick={copyLink}
                className="flex-shrink-0 p-2 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4 text-gray-500" />}
              </button>
            </div>
            <Button onClick={copyLink} className="w-full">
              {copied
                ? <><Check className="h-4 w-4" /> Másolva!</>
                : <><Copy className="h-4 w-4" /> Link másolása</>
              }
            </Button>
            <Button variant="ghost" onClick={onClose}>Bezárás</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
            <Input
              label="Email cím"
              name="email"
              type="email"
              placeholder="dolgozo@pelda.hu"
              required
            />

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Szerepkör</label>
              <select
                name="role"
                required
                className="rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#1a5c3a] focus:ring-2 focus:ring-[#1a5c3a]/20"
              >
                <option value="employee">Dolgozó</option>
                <option value="manager">Vezető</option>
              </select>
            </div>

            {positions.length > 0 && (
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Pozíció</label>
                <select
                  name="positionId"
                  className="rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#1a5c3a] focus:ring-2 focus:ring-[#1a5c3a]/20"
                >
                  <option value="">– Válassz pozíciót –</option>
                  {positions.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {isPrivileged && (
              <Input
                label="Órabér (Ft/h) – opcionális"
                name="hourlyRate"
                type="number"
                placeholder="pl. 1800"
                min={0}
              />
            )}

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex gap-3 mt-2">
              <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
                Mégse
              </Button>
              <Button
                type="button"
                variant="ghost"
                loading={linkLoading}
                className="flex-1"
                onClick={handleGenerateLink}
              >
                <Link2 className="h-4 w-4" />
                Link
              </Button>
              <Button type="submit" loading={loading} className="flex-1">
                <Send className="h-4 w-4" />
                Email
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
