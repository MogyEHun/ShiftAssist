'use client'

import { useState, useTransition } from 'react'
import { Megaphone, Send } from 'lucide-react'
import { sendBroadcast } from '@/app/actions/super-admin'

const TARGET_OPTIONS = [
  { value: 'all', label: 'Összes cég' },
  { value: 'active', label: 'Aktív előfizetők' },
  { value: 'trialing', label: 'Trial időszakban' },
  { value: 'canceled', label: 'Lejárt előfizetés' },
] as const

export function BroadcastClient() {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [target, setTarget] = useState<'all' | 'active' | 'trialing' | 'canceled'>('all')
  const [result, setResult] = useState<{ sent: number; error?: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSend = () => {
    if (!subject.trim() || !message.trim()) return
    setResult(null)
    startTransition(async () => {
      const res = await sendBroadcast(subject, message, target)
      setResult(res)
    })
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Megaphone className="h-4 w-4 text-slate-500" />
        <h2 className="font-semibold text-slate-800">Üzenet összeállítása</h2>
      </div>

      {/* Célcsoport */}
      <div>
        <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Célcsoport</label>
        <select
          value={target}
          onChange={e => setTarget(e.target.value as typeof target)}
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white"
        >
          {TARGET_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Tárgy */}
      <div>
        <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Tárgy</label>
        <input
          type="text"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          placeholder="Email tárgya..."
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
        />
      </div>

      {/* Üzenet */}
      <div>
        <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Üzenet</label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={8}
          placeholder="Az email tartalma. Sortörések megtartva."
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 placeholder:text-slate-300"
        />
      </div>

      {/* Előnézet */}
      {message && (
        <div className="rounded-lg bg-slate-50 border border-slate-100 p-4 text-sm text-slate-700 whitespace-pre-wrap">
          <p className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wide">Előnézet</p>
          {message}
        </div>
      )}

      {/* Küldés */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-slate-400">
          Az email az összes owner felhasználónak kerül kiküldésre a szűrt cégekből.
        </p>
        <button
          onClick={handleSend}
          disabled={isPending || !subject.trim() || !message.trim()}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {isPending ? 'Küldés...' : 'Küldés'}
        </button>
      </div>

      {/* Eredmény */}
      {result && (
        <div className={`rounded-lg px-4 py-3 text-sm font-medium ${
          result.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
        }`}>
          {result.error ? result.error : `${result.sent} email sikeresen elküldve.`}
        </div>
      )}
    </div>
  )
}
