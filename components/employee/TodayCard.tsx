import { Clock, CalendarDays, MapPin, Briefcase } from 'lucide-react'

interface ShiftRow {
  id: string
  title: string | null
  start_time: string
  end_time: string
  location: string | null
  required_position: string | null
  status: string
}

interface TodayCardProps {
  todayShifts: ShiftRow[]
  nextShift?: ShiftRow | null
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('hu-HU', { month: 'long', day: 'numeric', weekday: 'long' })
}

function getHoursUntil(iso: string) {
  const diff = new Date(iso).getTime() - Date.now()
  if (diff <= 0) return null
  const h = Math.floor(diff / 1000 / 60 / 60)
  const m = Math.floor((diff / 1000 / 60) % 60)
  if (h > 0) return `${h} óra ${m} perc múlva`
  return `${m} perc múlva`
}

export function TodayCard({ todayShifts, nextShift }: TodayCardProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Mai műszak</h2>

      {todayShifts.length === 0 ? (
        // Szabadnap kártya
        <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center shadow-sm">
          <CalendarDays className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="font-semibold text-gray-700 text-base">Ma szabadnap</p>
          {nextShift && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Következő műszak</p>
              <p className="text-sm font-semibold text-gray-800">
                {formatDate(nextShift.start_time)}
              </p>
              <p className="text-sm text-gray-600 mt-0.5 flex items-center justify-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {formatTime(nextShift.start_time)} – {formatTime(nextShift.end_time)}
              </p>
            </div>
          )}
        </div>
      ) : (
        // Aktív műszak kártyák
        <div className="space-y-3">
          {todayShifts.map(shift => {
            const hoursUntil = getHoursUntil(shift.start_time)
            return (
              <div key={shift.id} className="bg-[#1a5c3a] text-white rounded-2xl p-5 shadow-md">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse" />
                    <span className="text-sm font-medium text-white/80">Ma dolgozol</span>
                  </div>
                  {shift.status === 'published' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 font-medium">
                      Megerősítve
                    </span>
                  )}
                </div>

                {/* Nagy időpont */}
                <div className="text-3xl font-bold tracking-tight leading-none mb-1">
                  {formatTime(shift.start_time)}
                  <span className="text-white/60 text-xl mx-1">→</span>
                  {formatTime(shift.end_time)}
                </div>

                {/* Helyszín / pozíció */}
                <div className="mt-2 space-y-1">
                  {shift.location && (
                    <div className="flex items-center gap-2 text-white/80 text-sm">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      {shift.location}
                    </div>
                  )}
                  {shift.required_position && (
                    <div className="flex items-center gap-2 text-white/80 text-sm">
                      <Briefcase className="h-3.5 w-3.5 flex-shrink-0" />
                      {shift.required_position}
                    </div>
                  )}
                </div>

                {/* Countdown */}
                {hoursUntil && (
                  <div className="mt-3 pt-3 border-t border-white/20 text-sm text-white/70">
                    Indul: {hoursUntil}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
