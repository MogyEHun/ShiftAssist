'use client'

import { useState, useEffect } from 'react'
import { X, Sparkles, ChevronLeft, ChevronRight, AlertCircle, ChevronDown } from 'lucide-react'
import { AiShiftSuggestion } from '@/types'
import { generateSchedule, getRateLimitStatus } from '@/app/actions/ai-schedule'
import { format, startOfWeek, addWeeks } from 'date-fns'

interface Props {
  onGenerated: (suggestions: AiShiftSuggestion[]) => void
  onClose: () => void
  positions?: string[]
  employees?: { id: string; full_name: string }[]
  currentWeekStart?: string
}

const TOTAL_STEPS = 5

export function AiScheduleWizard({ onGenerated, onClose, positions = [], employees = [], currentWeekStart }: Props) {
  const nextMonday = format(startOfWeek(addWeeks(new Date(), 1), { weekStartsOn: 1 }), 'yyyy-MM-dd')

  // Step 1
  const [weekStart, setWeekStart] = useState(currentWeekStart ?? nextMonday)

  // Step 2
  const [openFrom, setOpenFrom] = useState('08:00')
  const [openTo, setOpenTo] = useState('20:00')
  const [minStaff, setMinStaff] = useState(2)
  const [shiftDurationHours, setShiftDurationHours] = useState(8)
  const [shiftsPerDay, setShiftsPerDay] = useState<1 | 2>(1)
  const [workDaysPerEmployee, setWorkDaysPerEmployee] = useState(5)

  // Step 3
  const [budgetCap, setBudgetCap] = useState('')

  // Step 4
  const [posBreakdown, setPosBreakdown] = useState<{ position: string; count: number }[]>(
    positions.map(p => ({ position: p, count: 1 }))
  )

  // Step 5
  const [preferences, setPreferences] = useState({
    respectAvailability: true,
    distributeEvenly: true,
    preferFullTime: false,
  })
  const [weeklyHourLimit, setWeeklyHourLimit] = useState(48)
  const [employeeOverrides, setEmployeeOverrides] = useState<Record<string, number>>({})
  const [showEmpLimits, setShowEmpLimits] = useState(false)
  const [note, setNote] = useState('')

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rateLimit, setRateLimit] = useState<{ used: number; limit: number } | null>(null)

  useEffect(() => {
    getRateLimitStatus().then(setRateLimit)
  }, [])

  function togglePref(key: keyof typeof preferences) {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function updatePosCount(pos: string, count: number) {
    setPosBreakdown(prev => prev.map(p => p.position === pos ? { ...p, count: Math.max(0, count) } : p))
  }

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    try {
      const result = await generateSchedule({
        weekStart,
        minStaffPerDay: minStaff,
        openFrom,
        openTo,
        shiftDurationHours,
        shiftsPerDay,
        workDaysPerEmployee,
        note: note || undefined,
        budgetCapFt: budgetCap ? parseInt(budgetCap) : undefined,
        positionBreakdown: posBreakdown.filter(p => p.count > 0),
        preferences,
        weeklyHourLimit,
        employeeHourLimits: Object.entries(employeeOverrides)
          .filter(([, v]) => v > 0)
          .map(([userId, limit]) => ({ userId, limit })),
      })

      if (result.error) { setError(result.error); return }
      onGenerated(result.data ?? [])
      onClose()
    } catch (e: any) {
      setError(e.message ?? 'Hiba történt')
    } finally {
      setLoading(false)
    }
  }

  const stepTitles = ['Hét', 'Alapbeállítások', 'Költségkeret', 'Pozíciók', 'Preferenciák']

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
        {/* Fejléc */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#d4a017]" />
            <h2 className="text-base font-semibold text-gray-900">AI Beosztástervező</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-5 pt-4 flex-shrink-0">
          <div className="flex items-center gap-1.5 mb-1">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < step ? 'bg-[#1a5c3a]' : 'bg-gray-100'}`} />
            ))}
          </div>
          <p className="text-xs text-gray-400">{step}/{TOTAL_STEPS} – {stepTitles[step - 1]}</p>
        </div>

        {/* Tartalom */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {step === 1 && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Hét kezdete (hétfő)</label>
                <input type="date" value={weekStart} onChange={e => setWeekStart(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none" />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nyitás</label>
                  <input type="time" value={openFrom} onChange={e => setOpenFrom(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Zárás</label>
                  <input type="time" value={openTo} onChange={e => setOpenTo(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Műszakhossz</label>
                <select value={shiftDurationHours} onChange={e => setShiftDurationHours(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none bg-white">
                  {[4, 6, 8, 10, 12].map(h => (
                    <option key={h} value={h}>{h} óra</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Napi műszakforgatás</label>
                <div className="flex gap-3">
                  {([1, 2] as const).map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setShiftsPerDay(n)}
                      className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium border transition-colors ${
                        shiftsPerDay === n
                          ? 'bg-[#1a5c3a] text-white border-[#1a5c3a]'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {n === 1 ? '1 műszak/nap' : '2 műszak/nap'}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  {shiftsPerDay === 2 ? 'Délelőttes és délutános műszak váltakozva.' : 'Mindenki ugyanabban a műszakban dolgozik.'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Munkanapok/fő/hét: <span className="text-[#1a5c3a] font-semibold">{workDaysPerEmployee} nap</span>
                </label>
                <input type="range" min={1} max={7} value={workDaysPerEmployee} onChange={e => setWorkDaysPerEmployee(Number(e.target.value))}
                  className="w-full accent-[#1a5c3a]" />
                <div className="flex justify-between text-xs text-gray-400 mt-1"><span>1</span><span>7</span></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Min. dolgozó/nap: <span className="text-[#1a5c3a] font-semibold">{minStaff}</span>
                </label>
                <input type="range" min={1} max={10} value={minStaff} onChange={e => setMinStaff(Number(e.target.value))}
                  className="w-full accent-[#1a5c3a]" />
                <div className="flex justify-between text-xs text-gray-400 mt-1"><span>1</span><span>10</span></div>
              </div>
            </>
          )}

          {step === 3 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Maximum heti bérköltség (Ft) – opcionális
              </label>
              <input type="number" value={budgetCap} onChange={e => setBudgetCap(e.target.value)}
                placeholder="pl. 500000"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none" />
              <p className="text-xs text-gray-400 mt-1.5">Ha megadod, az AI igyekszik ezen belül maradni.</p>
            </div>
          )}

          {step === 4 && (
            <div>
              <p className="text-sm text-gray-500 mb-3">
                Add meg, naponta hány fő szükséges pozíciónként.
              </p>
              {posBreakdown.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Nincs beállított pozíció.</p>
              ) : (
                <div className="space-y-2">
                  {posBreakdown.map(p => (
                    <div key={p.position} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">{p.position}</span>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => updatePosCount(p.position, p.count - 1)}
                          className="w-7 h-7 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center justify-center text-sm">–</button>
                        <span className="w-5 text-center text-sm font-medium">{p.count}</span>
                        <button type="button" onClick={() => updatePosCount(p.position, p.count + 1)}
                          className="w-7 h-7 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center justify-center text-sm">+</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 5 && (
            <>
              <div className="space-y-2">
                {([
                  ['respectAvailability', 'Vegye figyelembe az elérhetőséget'],
                  ['distributeEvenly', 'Egyenletes elosztás'],
                  ['preferFullTime', 'Teljes műszakok előnyben'],
                ] as [keyof typeof preferences, string][]).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" checked={preferences[key]} onChange={() => togglePref(key)}
                      className="rounded border-gray-300 text-[#1a5c3a] focus:ring-[#1a5c3a] w-4 h-4" />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">{label}</span>
                  </label>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Általános heti óralimit – <span className="text-[#1a5c3a] font-semibold">{weeklyHourLimit} óra</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={168}
                  value={weeklyHourLimit}
                  onChange={e => setWeeklyHourLimit(Math.max(1, Math.min(168, Number(e.target.value))))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none"
                />
                <p className="text-xs text-gray-400 mt-1">Az AI ezen belül osztja be a dolgozókat. (Alapértelmezett: 48 óra)</p>
              </div>

              {employees.length > 0 && (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowEmpLimits(v => !v)}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <span>Egyéni límit dolgozónként</span>
                    <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showEmpLimits ? 'rotate-180' : ''}`} />
                  </button>
                  {showEmpLimits && (
                    <div className="border-t border-gray-100 divide-y divide-gray-100 max-h-48 overflow-y-auto">
                      {employees.map(emp => (
                        <div key={emp.id} className="flex items-center justify-between px-3 py-2 gap-3">
                          <span className="text-sm text-gray-700 truncate flex-1">{emp.full_name}</span>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <input
                              type="number"
                              min={1}
                              max={168}
                              placeholder={String(weeklyHourLimit)}
                              value={employeeOverrides[emp.id] ?? ''}
                              onChange={e => {
                                const val = e.target.value === '' ? undefined : Math.max(1, Math.min(168, Number(e.target.value)))
                                setEmployeeOverrides(prev => {
                                  const next = { ...prev }
                                  if (val === undefined) delete next[emp.id]
                                  else next[emp.id] = val
                                  return next
                                })
                              }}
                              className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none"
                            />
                            <span className="text-xs text-gray-400">óra</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Megjegyzés (opcionális)</label>
                <textarea value={note} onChange={e => setNote(e.target.value)}
                  placeholder="pl. Hétvégén emelt létszám szükséges..."
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none resize-none" />
              </div>
              {rateLimit && (
                <p className={`text-xs ${rateLimit.used >= rateLimit.limit ? 'text-red-500' : 'text-gray-400'}`}>
                  {rateLimit.used}/{rateLimit.limit} kérés felhasználva ma
                </p>
              )}
            </>
          )}

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Navigáció */}
        <div className="flex justify-between gap-2 p-5 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={() => step > 1 ? setStep(s => s - 1) : onClose()}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
            {step === 1 ? 'Mégse' : 'Vissza'}
          </button>

          {step < TOTAL_STEPS ? (
            <button
              onClick={() => setStep(s => s + 1)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#1a5c3a] rounded-xl hover:bg-[#15472e] transition-colors"
            >
              Következő
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={loading || (rateLimit ? rateLimit.used >= rateLimit.limit : false)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#d4a017] rounded-xl hover:bg-[#b8891a] transition-colors disabled:opacity-50"
            >
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generálás...</>
              ) : (
                <><Sparkles className="h-4 w-4" />Generálás</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
