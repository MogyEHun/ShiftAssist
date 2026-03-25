'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/components/providers/LanguageProvider'
import type { EmployeeStat, MonthlyTrend, LeaveStats } from '@/app/actions/stats'
import type { SiteWithCount } from '@/app/actions/sites'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area, CartesianGrid,
} from 'recharts'

interface Props {
  stats: EmployeeStat[]
  month: string
  trends: MonthlyTrend[]
  leaveStats: LeaveStats
  sites: SiteWithCount[]
  positions: string[]
  activeSite?: string
  activePosition?: string
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

const TABS = ['Összesítő', 'Trendek', 'Szabadságok']

export function StatsClient({ stats, month, trends, leaveStats, sites, positions, activeSite, activePosition }: Props) {
  const { t } = useTranslation()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState(0)

  function buildUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams()
    const base = { month, site: activeSite, position: activePosition, ...overrides }
    if (base.month) params.set('month', base.month)
    if (base.site) params.set('site', base.site)
    if (base.position) params.set('position', base.position)
    return `/dashboard/stats?${params.toString()}`
  }

  const selectCls = 'text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a]'

  const active = stats.filter(s => s.shiftCount > 0)
  const inactive = stats.filter(s => s.shiftCount === 0)

  const totalHours = active.reduce((sum, s) => sum + s.totalHours, 0)
  const totalCost = active.reduce((sum, s) => sum + s.totalPay, 0)
  const avgHours = active.length > 0 ? Math.round((totalHours / active.length) * 10) / 10 : 0
  const sorted = [...active].sort((a, b) => b.totalHours - a.totalHours)
  const chartData = sorted.slice(0, 15).map(s => ({
    name: s.fullName.split(' ').pop() ?? s.fullName,
    hours: s.totalHours,
  }))

  // Trendek
  const peakCostMonth = trends.length > 0
    ? trends.reduce((mx, t) => t.totalCost > mx.totalCost ? t : mx, trends[0])
    : null
  const peakShiftMonth = trends.length > 0
    ? trends.reduce((mx, t) => t.shiftCount > mx.shiftCount ? t : mx, trends[0])
    : null

  return (
    <div className="space-y-6">
      {/* Fejléc */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Részletes statisztikák</h1>
          <p className="text-sm text-gray-500 mt-0.5">Dolgozók teljesítménye, trendek és szabadságok</p>
        </div>
        {activeTab === 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {sites.length > 0 && (
              <select
                value={activeSite ?? ''}
                onChange={e => router.push(buildUrl({ site: e.target.value || undefined }))}
                className={selectCls}
              >
                <option value="">Összes telephely</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
            {positions.length > 0 && (
              <select
                value={activePosition ?? ''}
                onChange={e => router.push(buildUrl({ position: e.target.value || undefined }))}
                className={selectCls}
              >
                <option value="">Összes munkakör</option>
                {positions.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            )}
            <input
              type="month"
              value={month}
              onChange={e => e.target.value && router.push(buildUrl({ month: e.target.value }))}
              className={selectCls}
            />
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === i
                ? 'border-[#1a5c3a] text-[#1a5c3a]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Tab 1: Összesítő ── */}
      {activeTab === 0 && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label={t('stats.totalHours')} value={`${totalHours.toLocaleString('hu-HU')} óra`} />
            <StatCard label={t('stats.totalCost')} value={`${totalCost.toLocaleString('hu-HU')} Ft`} />
            <StatCard label={t('stats.activeStaff')} value={String(active.length)} />
            <StatCard label={t('stats.avgHours')} value={`${avgHours} óra`} />
          </div>

          {active.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 py-16 text-center text-gray-400">
              <p className="text-sm">{t('stats.noData')}</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <p className="text-sm font-semibold text-gray-700 mb-4">{t('stats.colHours')}</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={30} />
                    <Tooltip formatter={(v: unknown) => [`${v} h`, t('stats.colHours')]} contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                    <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                      {chartData.map((_, i) => <Cell key={i} fill={i === 0 ? '#1a5c3a' : '#d1fae5'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('stats.colEmployee')}</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">{t('stats.colPosition')}</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('stats.colShifts')}</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('stats.colHours')}</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">{t('stats.colPay')}</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">{t('stats.colType')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {sorted.map(s => (
                      <tr key={s.userId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{s.fullName}</td>
                        <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{s.position ?? '–'}</td>
                        <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{s.shiftCount}</td>
                        <td className="px-4 py-3 text-right text-gray-900 font-semibold tabular-nums">{s.totalHours} h</td>
                        <td className="px-4 py-3 text-right text-gray-600 tabular-nums hidden md:table-cell">{s.totalPay.toLocaleString('hu-HU')} Ft</td>
                        <td className="px-4 py-3 text-right hidden lg:table-cell">
                          <span className="text-xs text-gray-400">{s.payType === 'hourly' ? t('stats.hourly') : t('stats.daily')}</span>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-semibold">
                      <td className="px-4 py-3 text-gray-900">Összesen</td>
                      <td className="hidden sm:table-cell" />
                      <td className="px-4 py-3 text-right text-gray-900 tabular-nums">{active.reduce((s, r) => s + r.shiftCount, 0)}</td>
                      <td className="px-4 py-3 text-right text-gray-900 tabular-nums">{totalHours} h</td>
                      <td className="px-4 py-3 text-right text-gray-900 tabular-nums hidden md:table-cell">{totalCost.toLocaleString('hu-HU')} Ft</td>
                      <td className="hidden lg:table-cell" />
                    </tr>
                  </tbody>
                </table>
              </div>

              {inactive.length > 0 && (
                <details className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <summary className="px-4 py-3 text-sm text-gray-400 cursor-pointer select-none hover:text-gray-600">
                    {t('stats.inactive')} ({inactive.length})
                  </summary>
                  <div className="divide-y divide-gray-50">
                    {inactive.map(s => (
                      <div key={s.userId} className="px-4 py-2.5 flex items-center justify-between text-sm text-gray-400">
                        <span>{s.fullName}</span>
                        <span className="text-xs">{s.position ?? '–'}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </>
          )}
        </>
      )}

      {/* ── Tab 2: Trendek ── */}
      {activeTab === 1 && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              label="Legtöbb műszak"
              value={peakShiftMonth?.label ?? '–'}
              sub={peakShiftMonth ? `${peakShiftMonth.shiftCount} műszak` : undefined}
            />
            <StatCard
              label="Legmagasabb bérköltség"
              value={peakCostMonth?.label ?? '–'}
              sub={peakCostMonth ? `${peakCostMonth.totalCost.toLocaleString('hu-HU')} Ft` : undefined}
            />
          </div>

          {trends.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 py-16 text-center text-gray-400">
              <p className="text-sm">Nincs elegendő adat a trendekhez.</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <p className="text-sm font-semibold text-gray-700 mb-4">Bérköltség – elmúlt 6 hónap</p>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={trends} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1a5c3a" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#1a5c3a" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={50}
                      tickFormatter={v => `${(v / 1000).toFixed(0)}e`} />
                    <Tooltip
                      formatter={(v: unknown) => [`${typeof v === 'number' ? v.toLocaleString('hu-HU') : v} Ft`, 'Bérköltség']}
                      contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                    />
                    <Area type="monotone" dataKey="totalCost" stroke="#1a5c3a" strokeWidth={2} fill="url(#costGrad)" dot={{ fill: '#1a5c3a', r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <p className="text-sm font-semibold text-gray-700 mb-4">Ledolgozott órák – elmúlt 6 hónap</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={trends} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={30} />
                    <Tooltip formatter={(v: unknown) => [`${v} h`, 'Ledolgozott óra']} contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                    <Bar dataKey="totalHours" radius={[4, 4, 0, 0]} fill="#d1fae5">
                      {trends.map((_, i) => <Cell key={i} fill={i === trends.length - 1 ? '#1a5c3a' : '#d1fae5'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </>
      )}

      {/* ── Tab 3: Szabadságok ── */}
      {activeTab === 2 && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Jóváhagyott napok" value={`${leaveStats.totalApproved} nap`} />
            <StatCard label="Függőben lévő kérelmek" value={`${leaveStats.totalPending} nap`} />
          </div>

          {leaveStats.byType.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 py-16 text-center text-gray-400">
              <p className="text-sm">Nincs szabadságadat erre az évre.</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <p className="text-sm font-semibold text-gray-700 mb-4">Szabadságok típusonként (nap)</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={leaveStats.byType} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={25} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                    <Bar dataKey="approved" name="Jóváhagyott" stackId="a" fill="#1a5c3a" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="pending" name="Függőben" stackId="a" fill="#fbbf24" />
                    <Bar dataKey="rejected" name="Elutasított" stackId="a" fill="#f87171" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex gap-4 mt-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#1a5c3a] inline-block" />Jóváhagyott</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-amber-400 inline-block" />Függőben</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-red-400 inline-block" />Elutasított</span>
                </div>
              </div>

              {leaveStats.byEmployee.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-700">Szabadságok dolgozónként</p>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Dolgozó</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Összes nap</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Jóváhagyott</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {leaveStats.byEmployee.map(e => (
                        <tr key={e.fullName} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{e.fullName}</td>
                          <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{e.totalDays}</td>
                          <td className="px-4 py-3 text-right text-[#1a5c3a] font-semibold tabular-nums">{e.approved}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
