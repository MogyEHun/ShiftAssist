import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Users, CalendarDays, Clock, UmbrellaOff, Banknote } from 'lucide-react'
import { startOfWeek, endOfWeek, format } from 'date-fns'
import { decrypt } from '@/lib/encryption'
import { getLocale, getT } from '@/lib/i18n'
import { getSites } from '@/app/actions/sites'
import { getCompanyUsers } from '@/lib/data/users'
import { Suspense } from 'react'
import { DashboardSiteFilter } from '@/components/dashboard/DashboardSiteFilter'

// Statisztika kártya komponens
function StatCard({
  title, value, subtitle, icon: Icon, color,
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  color: 'green' | 'blue' | 'amber' | 'purple'
}) {
  const colors = {
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
  }
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
        </div>
        <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

export default async function DashboardPage({ searchParams }: { searchParams?: { siteId?: string } }) {
  const selectedSiteId = searchParams?.siteId ?? null
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('full_name_encrypted, role, company_id')
    .eq('id', user.id)
    .single()

  if (!userData) redirect('/login')

  const t = getT(getLocale())
  const fullName = userData.full_name_encrypted ? decrypt(userData.full_name_encrypted) : ''
  const isPrivileged = ['owner', 'admin', 'manager'].includes(userData.role)
  const now = new Date()
  const todayStr = format(now, 'yyyy-MM-dd')
  const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')

  const adminSupabase = createAdminClient()

  // Telephelyek és dolgozók (site szűrőhöz)
  const [sites, allCompanyUsers] = isPrivileged
    ? await Promise.all([getSites(), getCompanyUsers(userData.company_id)])
    : [[], []]

  const siteFilterUserIds: string[] | null = selectedSiteId
    ? allCompanyUsers.filter(u => u.site_id === selectedSiteId).map(u => u.id)
    : null

  // Párhuzamos adatlekérések
  const [activeStaffRes, todayShiftsRes, pendingLeaveRes, weekShiftsRes, todayScheduleRes] = await Promise.all([
    // Aktív dolgozók száma
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', userData.company_id)
      .eq('is_active', true),

    // Mai műszakok száma
    supabase
      .from('shifts')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', userData.company_id)
      .in('status', ['published', 'confirmed', 'swappable'])
      .gte('start_time', `${todayStr}T00:00:00`)
      .lte('start_time', `${todayStr}T23:59:59`),

    // Függőben lévő szabadságkérelmek (csak managernek)
    isPrivileged
      ? supabase
          .from('leave_requests')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', userData.company_id)
          .eq('status', 'pending')
      : Promise.resolve({ count: 0 }),

    // Heti műszakok órabér összesítés (csak managernek)
    isPrivileged
      ? supabase
          .from('shifts')
          .select('start_time, end_time, users(hourly_rate)')
          .eq('company_id', userData.company_id)
          .eq('status', 'published')
          .gte('start_time', `${weekStart}T00:00:00`)
          .lte('start_time', `${weekEnd}T23:59:59`)
      : Promise.resolve({ data: [] }),

    // Mai beosztás részletesen (csak managernek) – admin kliens, RLS megkerülve
    isPrivileged
      ? (() => {
          let q = adminSupabase
            .from('shifts')
            .select('id, start_time, end_time, status, break_minutes, user_id, users!shifts_user_id_fkey(full_name_encrypted, position)')
            .eq('company_id', userData.company_id)
            .gte('start_time', `${todayStr}T00:00:00`)
            .lte('start_time', `${todayStr}T23:59:59`)
            .order('start_time', { ascending: true })
          if (siteFilterUserIds) q = q.in('user_id', siteFilterUserIds)
          return q
        })()
      : Promise.resolve({ data: [] }),
  ])

  // Heti bérköltség számítás
  let weeklyLaborCost = 0
  if (isPrivileged && weekShiftsRes.data) {
    for (const shift of weekShiftsRes.data as Array<{
      start_time: string; end_time: string; users: { hourly_rate: number | null } | null
    }>) {
      const hours = (new Date(shift.end_time).getTime() - new Date(shift.start_time).getTime()) / 3600000
      const rate = shift.users?.hourly_rate ?? 0
      weeklyLaborCost += hours * rate
    }
  }

  // Mai beosztás feldolgozása
  type TodayShiftRaw = {
    id: string
    start_time: string
    end_time: string
    status: string
    break_minutes: number | null
    user_id: string | null
    users: { full_name_encrypted: string | null; position: string | null } | null
  }
  const todaySchedule = (isPrivileged && todayScheduleRes.data)
    ? (todayScheduleRes.data as TodayShiftRaw[]).map(s => ({
        id: s.id,
        start_time: s.start_time,
        end_time: s.end_time,
        status: s.status,
        break_minutes: s.break_minutes,
        employeeName: s.users?.full_name_encrypted ? decrypt(s.users.full_name_encrypted) : t('dashboard.unassigned'),
        position: s.users?.position ?? null,
      }))
    : []

  const greeting = () => {
    const h = now.getHours()
    if (h < 12) return t('dashboard.greetingMorning')
    if (h < 18) return t('dashboard.greetingAfternoon')
    return t('dashboard.greetingEvening')
  }

  return (
    <div className="p-8">
      {/* Fejléc */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {greeting()}, {fullName.split(' ')[0]}! 👋
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {now.toLocaleDateString('hu-HU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Statisztika kártyák */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title={t('dashboard.todayShifts')}
          value={todayShiftsRes.count ?? 0}
          subtitle={t('dashboard.publishedSchedule')}
          icon={CalendarDays}
          color="green"
        />
        <StatCard
          title={t('dashboard.activeStaff')}
          value={activeStaffRes.count ?? 0}
          subtitle={t('dashboard.allActiveMembers')}
          icon={Users}
          color="blue"
        />
        {isPrivileged && (
          <>
            <StatCard
              title={t('dashboard.pendingLeave')}
              value={pendingLeaveRes.count ?? 0}
              subtitle={t('dashboard.awaitingApproval')}
              icon={UmbrellaOff}
              color="amber"
            />
            <StatCard
              title={t('dashboard.weeklyCost')}
              value={weeklyLaborCost > 0 ? `${Math.round(weeklyLaborCost).toLocaleString('hu-HU')} Ft` : '–'}
              subtitle={t('dashboard.thisWeek')}
              icon={Banknote}
              color="purple"
            />
          </>
        )}
        {!isPrivileged && (
          <StatCard
            title={t('dashboard.weeklyShifts')}
            value="–"
            subtitle={t('dashboard.scheduleComingSoon')}
            icon={Clock}
            color="purple"
          />
        )}
      </div>

      {/* Mai beosztás – managereknek */}
      {isPrivileged && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              {t('dashboard.todaySchedule')}
            </h2>
            {sites.length > 0 && (
              <Suspense fallback={null}>
                <DashboardSiteFilter sites={sites} currentSiteId={selectedSiteId} />
              </Suspense>
            )}
          </div>
          {todaySchedule.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-6 text-center text-sm text-gray-400">
              {t('dashboard.noShiftsToday')}
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Dolgozó</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Pozíció</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Kezdés</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Befejezés</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Hossz</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Státusz</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {todaySchedule.map(s => {
                    const startDate = new Date(s.start_time)
                    const endDate = new Date(s.end_time)
                    const grossMins = Math.max(0, (endDate.getTime() - startDate.getTime()) / 60000)
                    const netMins = Math.max(0, grossMins - (s.break_minutes ?? 0))
                    const h = Math.floor(netMins / 60)
                    const m = netMins % 60
                    const duration = m > 0 ? `${h}ó ${m}p` : `${h}ó`
                    const statusStyle: Record<string, string> = {
                      published: 'bg-green-50 text-green-700',
                      confirmed: 'bg-blue-50 text-blue-700',
                      swappable: 'bg-amber-50 text-amber-700',
                      draft: 'bg-gray-100 text-gray-500',
                    }
                    const statusLabel: Record<string, string> = {
                      published: 'Fixálva',
                      confirmed: 'Visszaigazolt',
                      swappable: 'Cserélhető',
                      draft: 'Tervezet',
                    }
                    return (
                      <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{s.employeeName}</td>
                        <td className="px-4 py-3 text-gray-500">{s.position ?? '–'}</td>
                        <td className="px-4 py-3 text-gray-700 tabular-nums">{format(startDate, 'HH:mm')}</td>
                        <td className="px-4 py-3 text-gray-700 tabular-nums">{format(endDate, 'HH:mm')}</td>
                        <td className="px-4 py-3 text-gray-500">{duration}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle[s.status] ?? 'bg-gray-100 text-gray-500'}`}>
                            {statusLabel[s.status] ?? s.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Gyors műveletek */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          {t('dashboard.quickActions')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {isPrivileged && (
            <a
              href="/dashboard/staff"
              className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-4 hover:border-[#1a5c3a]/30 hover:shadow-sm transition-all group"
            >
              <div className="h-9 w-9 rounded-lg bg-[#1a5c3a]/8 flex items-center justify-center group-hover:bg-[#1a5c3a]/15 transition-colors">
                <Users className="h-4 w-4 text-[#1a5c3a]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{t('dashboard.manageStaff')}</p>
                <p className="text-xs text-gray-400">{t('dashboard.inviteEdit')}</p>
              </div>
            </a>
          )}
          <a
            href="/dashboard/leave"
            className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-4 hover:border-[#1a5c3a]/30 hover:shadow-sm transition-all group"
          >
            <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center">
              <UmbrellaOff className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">{t('dashboard.leaveRequest')}</p>
              <p className="text-xs text-gray-400">{t('dashboard.submitRequest')}</p>
            </div>
          </a>
          <a
            href="/dashboard/tasks"
            className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-4 hover:border-[#1a5c3a]/30 hover:shadow-sm transition-all group"
          >
            <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <CalendarDays className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">{t('dashboard.dailyTasks')}</p>
              <p className="text-xs text-gray-400">{t('dashboard.taskList')}</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  )
}
