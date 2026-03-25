'use client'

import type { EmployeeReliability } from '@/app/actions/reliability'

interface Props {
  stats: EmployeeReliability[]
}

function ScoreBadge({ score, totalShifts }: { score: number; totalShifts: number }) {
  if (totalShifts === 0) {
    return <span className="text-xs text-gray-400">Nincs adat</span>
  }
  const color = score >= 90 ? 'bg-green-100 text-green-700' : score >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      {score}%
    </span>
  )
}

export function ReliabilityClient({ stats }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Megbízhatóság</h2>
        <p className="text-sm text-gray-500 mt-0.5">Elmúlt 3 hónap – beérkezési pontosság a clock-in adatok alapján</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Dolgozó</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Munkakör</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Műszakok</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Időben</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Késett</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Nem jelent meg</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Pontosság</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stats.map(s => (
                <tr key={s.userId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{s.fullName}</td>
                  <td className="px-4 py-3 text-gray-500">{s.position ?? '–'}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{s.totalShifts}</td>
                  <td className="px-4 py-3 text-center text-green-600 font-medium">{s.onTime}</td>
                  <td className="px-4 py-3 text-center text-amber-600 font-medium">{s.late}</td>
                  <td className="px-4 py-3 text-center text-red-500 font-medium">{s.noShow}</td>
                  <td className="px-4 py-3 text-center">
                    <ScoreBadge score={s.score} totalShifts={s.totalShifts} />
                  </td>
                </tr>
              ))}
              {stats.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    Nincs megjeleníthető adat
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
