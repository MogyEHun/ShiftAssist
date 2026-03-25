import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getWeeklySchedule, getMonthlySchedule } from '@/app/actions/schedule'
import { getCompanyAvailabilityDates } from '@/app/actions/availability'
import { ScheduleGrid } from '@/components/schedule/ScheduleGrid'
import { EmployeeScheduleView } from '@/components/schedule/EmployeeScheduleView'
import { DayView } from '@/components/schedule/DayView'
import { MonthlyView } from '@/components/schedule/MonthlyView'
import { ViewToggle } from '@/components/schedule/ViewToggle'
import { SiteFilterBar } from '@/components/schedule/SiteFilterBar'
import type { Site } from '@/types'
import { AvailabilityDashboardView } from '@/components/availability/AvailabilityDashboardView'
import { format, startOfWeek, startOfMonth, parseISO, isValid } from 'date-fns'
import { hu, enUS } from 'date-fns/locale'
import { Suspense } from 'react'
import { getLocale, getT } from '@/lib/i18n'
import { Info } from 'lucide-react'
import { CopyWeekButton } from '@/components/schedule/CopyWeekButton'

interface Props {
  searchParams: { view?: string; week?: string; date?: string; month?: string; siteId?: string }
}

export default async function SchedulePage({ searchParams }: Props) {
  const locale = getLocale()
  const t = getT(locale)
  const dfLocale = locale === 'en' ? enUS : hu
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('id, role, company_id, hourly_rate, site_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const isManager = ['owner', 'admin', 'manager'].includes(profile.role)

  // View type: day | week | month | availability (default: week)
  const validViews = ['day', 'week', 'month', 'availability']
  const view = (validViews.includes(searchParams.view ?? '') ? searchParams.view : 'week') as
    'day' | 'week' | 'month' | 'availability'

  const siteId = searchParams.siteId ?? null

  // ------- ELÉRHETŐSÉG NÉZET (manager) -------
  if (view === 'availability' && isManager) {
    const { data: companyRow } = await supabase
      .from('users')
      .select('companies(availability_enabled)')
      .eq('id', user.id)
      .single()
    const availabilityEnabled = (companyRow?.companies as { availability_enabled?: boolean } | null)?.availability_enabled ?? true
    const currentMonth = searchParams.month && isValid(parseISO(searchParams.month + '-01'))
      ? searchParams.month
      : format(new Date(), 'yyyy-MM')
    const staff = await getCompanyAvailabilityDates(currentMonth)

    return (
      <div className="p-6">
        <ScheduleHeader view={view} label={t('schedule.availabilitySubtitle')} isManager={isManager} t={t} profile={profile} siteId={siteId} />
        <AvailabilityDashboardView availabilityEnabled={availabilityEnabled} staff={staff} initialMonth={currentMonth} />
      </div>
    )
  }

  // Dolgozói nézet: csak saját műszakok heti nézetben
  if (!isManager) {
    const weekStart = resolveWeekStart(searchParams.week)
    const scheduleData = await getWeeklySchedule(weekStart)
    const myShifts = scheduleData.shifts.filter(s => s.user_id === profile.id)
    return (
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('schedule.myScheduleTitle')}</h1>
        <EmployeeScheduleView shifts={myShifts} currentUserId={profile.id} weekStart={weekStart} />
      </div>
    )
  }

  // ------- HAVI NÉZET -------
  if (view === 'month') {
    const monthStart = resolveMonthStart(searchParams.month)
    const { shifts, employees, monthStart: ms } = await getMonthlySchedule(monthStart)

    return (
      <div className="flex-1 p-6 flex flex-col overflow-hidden">
        <ScheduleHeader view={view} label={format(parseISO(monthStart), locale === 'en' ? 'MMMM yyyy' : 'yyyy. MMMM', { locale: dfLocale })} isManager={isManager} t={t} profile={profile} siteId={siteId} />
        <MonthlyView
          shifts={shifts}
          employees={employees}
          monthStart={ms}
          userRole={profile.role}
        />
      </div>
    )
  }

  // ------- NAPI NÉZET -------
  if (view === 'day') {
    const dateISO = resolveDate(searchParams.date)
    const weekStart = format(startOfWeek(parseISO(dateISO), { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const scheduleData = await getWeeklySchedule(weekStart, siteId ?? undefined)

    return (
      <div className="flex-1 p-6 flex flex-col overflow-hidden">
        <ScheduleHeader view={view} label={format(parseISO(dateISO), locale === 'en' ? 'MMMM d, EEEE' : 'yyyy. MMMM d. (EEEE)', { locale: dfLocale })} isManager={isManager} t={t} profile={profile} siteId={siteId} sites={scheduleData.sites} isMultiSite={scheduleData.isMultiSite} />
        <DayView
          scheduleData={scheduleData}
          currentUserId={profile.id}
          userRole={profile.role}
          dateISO={dateISO}
        />
      </div>
    )
  }

  // ------- HETI NÉZET (alapértelmezett) -------
  const weekStart = resolveWeekStart(searchParams.week)
  const scheduleData = await getWeeklySchedule(weekStart, siteId ?? undefined)

  return (
    <div className="flex-1 p-6 overflow-hidden flex flex-col">
      <ScheduleHeader view={view} label={format(parseISO(weekStart), locale === 'en' ? 'MMMM yyyy' : 'yyyy. MMMM', { locale: dfLocale })} isManager={isManager} t={t} profile={profile} siteId={siteId} sites={scheduleData.sites} isMultiSite={scheduleData.isMultiSite} />
      {isManager && (
        <div className="mb-4">
          <CopyWeekButton weekStart={weekStart} />
        </div>
      )}
      {scheduleData.isMultiSite && scheduleData.sites.length === 1 && (
        <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4 text-sm text-blue-700">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>Add hozzá a második telephelyet is, és rendeld hozzá a dolgozókat a <strong>Telephelyek</strong> nézetben.</span>
        </div>
      )}
      <ScheduleGrid
        scheduleData={scheduleData}
        currentUserId={profile.id}
        userRole={profile.role}
        weekStart={weekStart}
      />
    </div>
  )
}

// ── Header (szerver komponens) ──────────────────────────────────────────────
function ScheduleHeader({
  view, label, isManager, t, profile, siteId, sites, isMultiSite,
}: {
  view: 'day' | 'week' | 'month' | 'availability' | 'stations' | 'sites'
  label: string
  isManager: boolean
  t: (path: string) => string
  profile: { role: string; site_id?: string | null }
  siteId: string | null
  sites?: Site[]
  isMultiSite?: boolean
}) {
  const TITLES: Record<string, string> = {
    day: t('schedule.dayTitle'),
    week: t('schedule.weekTitle'),
    month: t('schedule.monthTitle'),
    availability: t('schedule.availabilityTitle'),
    stations: t('settings.stations'),
    sites: t('settings.sites'),
  }
  return (
    <div className="flex items-center justify-between mb-6 flex-shrink-0 flex-wrap gap-3">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{TITLES[view]}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{label}</p>
        </div>
        <Suspense fallback={null}>
          <ViewToggle currentView={view} isManager={isManager} group="schedule" />
        </Suspense>
      </div>
      <div className="flex items-center gap-3">
        {isMultiSite && sites && sites.length > 0 && (
          <Suspense fallback={null}>
            <SiteFilterBar
              sites={sites}
              currentSiteId={siteId}
              userRole={profile.role}
              userSiteId={profile.site_id}
            />
          </Suspense>
        )}
        {isManager && (
          <Suspense fallback={null}>
            <ViewToggle currentView={view} isManager={isManager} group="management" />
          </Suspense>
        )}
      </div>
    </div>
  )
}

// ── Dátum-segédek ───────────────────────────────────────────────────────────
function resolveWeekStart(week?: string): string {
  if (week && isValid(parseISO(week))) return week
  return format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
}

function resolveDate(date?: string): string {
  if (date && isValid(parseISO(date))) return date
  return format(new Date(), 'yyyy-MM-dd')
}

function resolveMonthStart(month?: string): string {
  if (month && isValid(parseISO(month))) {
    return format(startOfMonth(parseISO(month)), 'yyyy-MM-dd')
  }
  return format(startOfMonth(new Date()), 'yyyy-MM-dd')
}
