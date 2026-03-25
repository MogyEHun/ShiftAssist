'use client'

import { useState, useEffect } from 'react'
import { X, ChevronRight } from 'lucide-react'

const STEPS = [
  {
    id: 'staff',
    title: 'Hívd meg a csapatodat!',
    description: 'Első lépésként add hozzá a dolgozóidat. Küldhetsz meghívót email-ben.',
    targetId: 'nav-staff',
    position: 'right' as const,
  },
  {
    id: 'settings',
    title: 'Add meg a pozíciókat',
    description: 'A Beállítások oldalon megadhatod a munkakörök neveit (pl. Pincér, Szakács).',
    targetId: 'nav-settings',
    position: 'right' as const,
  },
  {
    id: 'schedule',
    title: 'Hozd létre az első műszakot',
    description: 'A Beosztás oldalon drag & drop-pal szerkesztheted a heti beosztást.',
    targetId: 'nav-schedule',
    position: 'right' as const,
  },
  {
    id: 'ai',
    title: 'Az AI asszisztens segít',
    description: 'Kérdezd az AI-t bármivel – tud beosztást tervezni és válaszolni a kérdéseire.',
    targetId: 'nav-ai',
    position: 'right' as const,
  },
  {
    id: 'billing',
    title: '14 napos ingyenes próbaidő',
    description: 'Az első 14 nap teljesen ingyenes. A próbaidő után válassz csomagot az igényeid alapján.',
    targetId: null,
    position: 'center' as const,
  },
]

export function OnboardingTour({ userRole }: { userRole: string }) {
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(false)
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({})

  useEffect(() => {
    if (!['owner', 'manager', 'admin'].includes(userRole)) return
    const done = localStorage.getItem('onboarding_completed')
    if (!done) {
      setTimeout(() => setVisible(true), 800)
    }
  }, [userRole])

  useEffect(() => {
    if (!visible) return
    const current = STEPS[step]
    if (!current.targetId) {
      setTooltipStyle({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' })
      return
    }
    const el = document.getElementById(current.targetId)
    if (!el) {
      setTooltipStyle({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' })
      return
    }
    const rect = el.getBoundingClientRect()
    setTooltipStyle({
      top: rect.top + rect.height / 2,
      left: rect.right + 12,
      transform: 'translateY(-50%)',
    })
  }, [step, visible])

  function next() {
    if (step < STEPS.length - 1) {
      setStep(step + 1)
    } else {
      finish()
    }
  }

  function finish() {
    localStorage.setItem('onboarding_completed', 'true')
    setVisible(false)
  }

  if (!visible) return null

  const current = STEPS[step]

  return (
    <>
      {/* Sötét háttér */}
      <div className="fixed inset-0 bg-black/40 z-[9998]" onClick={finish} />

      {/* Tooltip */}
      <div
        className="fixed z-[9999] w-72 bg-white rounded-2xl shadow-xl p-5"
        style={tooltipStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Bezárás */}
        <button
          onClick={finish}
          className="absolute top-3 right-3 p-1 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <X className="h-4 w-4 text-gray-400" />
        </button>

        {/* Lépések jelző */}
        <div className="flex gap-1 mb-3">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? 'bg-[#1a5c3a]' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        <h3 className="text-base font-bold text-gray-900 mb-1.5 pr-6">{current.title}</h3>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">{current.description}</p>

        <div className="flex items-center justify-between">
          <button
            onClick={finish}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Kihagyom
          </button>
          <button
            onClick={next}
            className="flex items-center gap-1 px-4 py-2 bg-[#1a5c3a] text-white text-sm rounded-lg hover:bg-[#1a5c3a]/90 transition-colors"
          >
            {step < STEPS.length - 1 ? 'Tovább' : 'Kezdjük!'}
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </>
  )
}
