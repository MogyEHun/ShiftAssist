'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CalendarDays, Plus, X, ChevronRight, ChevronLeft, Check, Calendar, ClipboardCheck, Umbrella, Users, Minus } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { completeOnboarding } from '@/app/actions/onboarding'

// ─── Konstansok ────────────────────────────────────────────

const COMPANY_TYPES = [
  { value: 'restaurant', label: 'Étterem', emoji: '🍽️' },
  { value: 'bar',        label: 'Bár / Kocsma', emoji: '🍺' },
  { value: 'hotel',      label: 'Szálloda', emoji: '🏨' },
  { value: 'retail',     label: 'Kiskereskedelem', emoji: '🛒' },
  { value: 'other',      label: 'Egyéb', emoji: '🏢' },
]

const TEAM_SIZES = [
  { value: 'small',      label: '0–15 fő',  dbSize: 'small' },
  { value: 'medium',     label: '15–30 fő', dbSize: 'medium' },
  { value: 'large',      label: '30–50 fő', dbSize: 'large' },
  { value: 'enterprise', label: '50+ fő',   dbSize: 'large', isEnterprise: true },
]

const PLAN_PRICES: Record<string, Record<string, string>> = {
  small:  { normal: '11 999 Ft/hó', premium: '14 999 Ft/hó' },
  medium: { normal: '21 999 Ft/hó', premium: '24 999 Ft/hó' },
  large:  { normal: '28 999 Ft/hó', premium: '31 999 Ft/hó' },
}

const NORMAL_FEATURES = [
  'Beosztáskezelés',
  'Szabadságkérelmek',
  'Csereigények',
  'Értesítések',
  'Személyzet kezelés',
]

const PREMIUM_EXTRA = [
  'QR-kódos jelenléti napló (Clock-in)',
  'AI beosztás-varázsló',
  'Részletes statisztikák',
  'Többszintű telephely-kezelés',
  'Prioritásos support',
]

const DEFAULT_POSITIONS = ['Pincér', 'Pultos', 'Séf', 'Hostess', 'Vezető']

const TUTORIAL_FEATURES = [
  { icon: Calendar,        title: 'Beosztás',  desc: 'Heti/napi nézet, AI-alapú javaslatok' },
  { icon: ClipboardCheck,  title: 'Jelenlét',  desc: 'QR-kódos be- és kijelentkezés' },
  { icon: Umbrella,        title: 'Szabadság', desc: 'Kérvények, jóváhagyás egy helyen' },
  { icon: Users,           title: 'Személyzet', desc: 'Meghívók, szerepkörök, telephelyek' },
]

const STEPS = ['Vállalkozás', 'Csapat', 'Csomag', 'Munkakörök', 'Kész']

// ─── Komponens ─────────────────────────────────────────────

export default function OnboardingPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const isPreview = searchParams.get('preview') === '1'

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1
  const [companyName, setCompanyName] = useState('')
  const [companyType, setCompanyType] = useState('')

  // Step 2
  const [teamSize, setTeamSize] = useState('')

  // Step 3
  const [plan, setPlan] = useState<'normal' | 'premium'>('normal')

  // Step 4
  const [positions, setPositions] = useState<string[]>(DEFAULT_POSITIONS)
  const [newPosition, setNewPosition] = useState('')

  // ÁSZF elfogadás
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  const isEnterprise = teamSize === 'enterprise'
  const dbSize = TEAM_SIZES.find(s => s.value === teamSize)?.dbSize ?? 'small'

  // ─── Validáció ────────────────────────────
  function validate(): string | null {
    if (step === 1) {
      if (!companyName.trim()) return 'Add meg a vállalkozás nevét.'
      if (!companyType) return 'Válaszd ki a vállalkozás típusát.'
      if (!acceptedTerms) return 'Az ÁSZF és az Adatkezelési tájékoztató elfogadása kötelező.'
    }
    if (step === 2 && !teamSize) return 'Válaszd ki a csapat méretét.'
    if (step === 4 && positions.length === 0) return 'Adj meg legalább egy munkakört.'
    return null
  }

  function next() {
    const err = validate()
    if (err) { setError(err); return }
    setError(null)
    // Enterprise esetén a csomag lépést átugorjuk
    if (step === 2 && isEnterprise) { setStep(4); return }
    if (step === 4) { setStep(5); return }
    setStep(s => s + 1)
  }

  function back() {
    setError(null)
    // Enterprise esetén visszaugrunk a 2-re (nem 3-ra)
    if (step === 4 && isEnterprise) { setStep(2); return }
    setStep(s => s - 1)
  }

  // ─── Pozíciók ─────────────────────────────
  function addPosition() {
    const trimmed = newPosition.trim()
    if (trimmed && !positions.includes(trimmed)) {
      setPositions([...positions, trimmed])
      setNewPosition('')
    }
  }

  function handlePositionKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); addPosition() }
  }

  // ─── Submit ───────────────────────────────
  async function handleSubmit() {
    if (isPreview) { router.push('/dashboard'); return }
    setLoading(true)
    const formData = new FormData()
    formData.set('companyName', companyName)
    formData.set('companyType', companyType)
    formData.set('companySize', dbSize)
    formData.set('subscriptionPlan', isEnterprise ? 'normal' : plan)
    formData.set('positions', JSON.stringify(positions))
    try {
      const result = await completeOnboarding(formData)
      if (result?.error) setError(result.error)
    } catch {
      // sikeres esetén redirect
    } finally {
      setLoading(false)
    }
  }

  // ─── Progress bar ─────────────────────────
  // ─── Render ───────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">

      {/* Preview banner */}
      {isPreview && (
        <div className="w-full max-w-xl mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-sm text-amber-700">
          <span className="font-semibold">Előnézet</span>
          <span className="text-amber-600">– az adatok nem kerülnek mentésre.</span>
          <button onClick={() => router.push('/dashboard')} className="ml-auto text-xs underline hover:text-amber-900">Kilépés</button>
        </div>
      )}

      {/* Logo */}
      <div className="mb-8 flex items-center gap-2">
        <div className="h-9 w-9 rounded-xl bg-[#1a5c3a] flex items-center justify-center">
          <CalendarDays className="h-5 w-5 text-white" />
        </div>
        <span className="text-2xl font-bold text-gray-900">ShiftAssist</span>
      </div>

      {/* Progress */}
      {step < 5 && (
        <div className="w-full max-w-xl mb-6">
          <div className="flex items-center justify-between">
            {STEPS.slice(0, 4).map((label, idx) => {
              const num = idx + 1
              const realStep = [1, 2, isEnterprise ? 4 : 3, 4][idx] ?? num
              const active = step === realStep
              const done = step > realStep || (isEnterprise && num === 3 && step >= 4)
              return (
                <div key={num} className="flex items-center flex-1">
                  <div className="flex flex-col items-center gap-1">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                      done  ? 'bg-[#1a5c3a] border-[#1a5c3a] text-white' :
                      active ? 'bg-white border-[#1a5c3a] text-[#1a5c3a]' :
                               'bg-white border-gray-200 text-gray-400'
                    }`}>
                      {done ? <Check className="h-4 w-4" /> : num}
                    </div>
                    <span className={`text-xs hidden sm:block ${active ? 'text-[#1a5c3a] font-medium' : 'text-gray-400'}`}>
                      {label}
                    </span>
                  </div>
                  {idx < 3 && (
                    <div className={`flex-1 h-0.5 mx-2 mb-4 ${done ? 'bg-[#1a5c3a]' : 'bg-gray-200'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Kártya */}
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

        {/* ── Lépés 1: Vállalkozás ── */}
        {step === 1 && (
          <>
            <h1 className="text-xl font-bold text-gray-900 mb-1">Mesélj a vállalkozásodról</h1>
            <p className="text-sm text-gray-500 mb-6">Ezek az adatok segítenek személyre szabni a ShiftAssist-et.</p>
            <div className="flex flex-col gap-5">
              <Input
                label="Vállalkozás neve"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="pl. Bistro Pest"
              />
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Vállalkozás típusa</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {COMPANY_TYPES.map(({ value, label, emoji }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setCompanyType(value)}
                      className={`flex flex-col items-center gap-1.5 px-3 py-4 rounded-xl border text-sm font-medium transition-all ${
                        companyType === value
                          ? 'border-[#1a5c3a] bg-[#1a5c3a]/5 text-[#1a5c3a]'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-2xl">{emoji}</span>
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ÁSZF elfogadás */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="mt-0.5 flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={e => setAcceptedTerms(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-[#1a5c3a] focus:ring-[#1a5c3a]/30 cursor-pointer"
                  />
                </div>
                <span className="text-sm text-gray-600 leading-relaxed">
                  Elolvastam és elfogadom az{' '}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-[#1a5c3a] underline hover:text-[#144d30]" onClick={e => e.stopPropagation()}>
                    Általános Szerződési Feltételeket
                  </a>
                  {' '}és az{' '}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-[#1a5c3a] underline hover:text-[#144d30]" onClick={e => e.stopPropagation()}>
                    Adatkezelési tájékoztatót
                  </a>.
                </span>
              </label>
            </div>
          </>
        )}

        {/* ── Lépés 2: Csapat mérete ── */}
        {step === 2 && (
          <>
            <h1 className="text-xl font-bold text-gray-900 mb-1">Mekkora a csapatod?</h1>
            <p className="text-sm text-gray-500 mb-6">Ez alapján ajánljuk a legmegfelelőbb csomagot.</p>
            <div className="flex flex-col gap-2">
              {TEAM_SIZES.map(({ value, label, dbSize: sz, isEnterprise: ent }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTeamSize(value)}
                  className={`flex items-center justify-between px-5 py-4 rounded-xl border text-sm transition-all ${
                    teamSize === value
                      ? 'border-[#1a5c3a] bg-[#1a5c3a]/5 text-[#1a5c3a]'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <span className="font-medium">{label}</span>
                  <span className="text-xs text-gray-400">
                    {ent ? 'Egyedi árajánlat' : `${PLAN_PRICES[sz].normal}-tól`}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Lépés 3: Csomag (csak nem-enterprise) ── */}
        {step === 3 && !isEnterprise && (
          <>
            <h1 className="text-xl font-bold text-gray-900 mb-1">Válassz csomagot</h1>
            <p className="text-sm text-gray-500 mb-6">14 napos ingyenes próba, bankkártya nélkül.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Normál kártya */}
              <button
                type="button"
                onClick={() => setPlan('normal')}
                className={`text-left rounded-xl border-2 p-5 transition-all ${
                  plan === 'normal' ? 'border-[#1a5c3a] bg-[#1a5c3a]/5' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-gray-900">Normál</span>
                  {plan === 'normal' && (
                    <span className="h-5 w-5 rounded-full bg-[#1a5c3a] flex items-center justify-center">
                      <Check className="h-3 w-3 text-white" />
                    </span>
                  )}
                </div>
                <p className="text-2xl font-bold text-gray-900">{PLAN_PRICES[dbSize]?.normal ?? '–'}</p>
                <p className="text-xs text-gray-400 mb-4">havonta, áfa nélkül</p>
                <div className="space-y-2">
                  {NORMAL_FEATURES.map(f => (
                    <div key={f} className="flex items-center gap-2 text-xs text-gray-700">
                      <Check className="h-3.5 w-3.5 text-[#1a5c3a] flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                  {PREMIUM_EXTRA.slice(0, 2).map(f => (
                    <div key={f} className="flex items-center gap-2 text-xs text-gray-300">
                      <Minus className="h-3.5 w-3.5 flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
              </button>

              {/* Prémium kártya */}
              <button
                type="button"
                onClick={() => setPlan('premium')}
                className={`relative text-left rounded-xl border-2 p-5 transition-all ${
                  plan === 'premium' ? 'border-[#1a5c3a] bg-[#1a5c3a]/5' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-[#1a5c3a] text-white text-[10px] font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                    Legnépszerűbb
                  </span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-gray-900">Prémium</span>
                  {plan === 'premium' && (
                    <span className="h-5 w-5 rounded-full bg-[#1a5c3a] flex items-center justify-center">
                      <Check className="h-3 w-3 text-white" />
                    </span>
                  )}
                </div>
                <p className="text-2xl font-bold text-gray-900">{PLAN_PRICES[dbSize]?.premium ?? '–'}</p>
                <p className="text-xs text-gray-400 mb-4">havonta, áfa nélkül</p>
                <div className="space-y-2">
                  {NORMAL_FEATURES.map(f => (
                    <div key={f} className="flex items-center gap-2 text-xs text-gray-700">
                      <Check className="h-3.5 w-3.5 text-[#1a5c3a] flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                  {PREMIUM_EXTRA.map(f => (
                    <div key={f} className="flex items-center gap-2 text-xs text-[#1a5c3a] font-medium">
                      <Check className="h-3.5 w-3.5 flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
              </button>

            </div>
          </>
        )}

        {/* ── Lépés 4: Munkakörök ── */}
        {step === 4 && (
          <>
            <h1 className="text-xl font-bold text-gray-900 mb-1">Munkakörök beállítása</h1>
            <p className="text-sm text-gray-500 mb-6">Ezeket rendelheted hozzá a dolgozókhoz. Bármikor módosíthatod.</p>
            <div className="flex flex-wrap gap-2 mb-4 min-h-[44px]">
              {positions.map(pos => (
                <span
                  key={pos}
                  className="flex items-center gap-1.5 bg-[#1a5c3a]/8 text-[#1a5c3a] text-sm px-3 py-1.5 rounded-lg font-medium"
                >
                  {pos}
                  <button type="button" onClick={() => setPositions(positions.filter(p => p !== pos))} className="hover:text-red-500 transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Új munkakör neve..."
                value={newPosition}
                onChange={e => setNewPosition(e.target.value)}
                onKeyDown={handlePositionKeyDown}
                className="flex-1"
              />
              <Button type="button" variant="secondary" onClick={addPosition} className="px-3">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-2">Enter-rel vagy a + gombbal adhatsz hozzá.</p>
          </>
        )}

        {/* ── Lépés 5: Kész ── */}
        {step === 5 && (
          <>
            <div className="flex flex-col items-center text-center mb-8">
              <div className="h-16 w-16 rounded-full bg-[#1a5c3a]/10 flex items-center justify-center mb-4">
                <Check className="h-8 w-8 text-[#1a5c3a]" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Minden készen áll!</h1>
              <p className="text-sm text-gray-500">Ideje beosztani a csapatod.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-8">
              {TUTORIAL_FEATURES.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <div className="h-8 w-8 rounded-lg bg-[#1a5c3a]/10 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-[#1a5c3a]" />
                  </div>
                  <p className="text-sm font-semibold text-gray-800">{title}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Hibaüzenet */}
        {error && (
          <div className="mt-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Navigáció */}
        <div className="mt-6 flex gap-3">
          {step > 1 && step < 5 && (
            <Button type="button" variant="ghost" onClick={back} className="flex-1">
              <ChevronLeft className="h-4 w-4" /> Vissza
            </Button>
          )}
          {step < 4 && (
            <Button type="button" fullWidth onClick={next}>
              Következő <ChevronRight className="h-4 w-4" />
            </Button>
          )}
          {step === 4 && (
            <Button type="button" fullWidth onClick={next}>
              Megnézem a funkciókat <ChevronRight className="h-4 w-4" />
            </Button>
          )}
          {step === 5 && (
            <Button type="button" fullWidth loading={loading} onClick={handleSubmit}>
              Indulás a dashboardra →
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
