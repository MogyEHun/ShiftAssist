'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, CalendarDays, CheckSquare, Menu, Bell, LogOut, RefreshCcw, Building2, UserCircle } from 'lucide-react'
import { EmployeeNav } from '@/components/layout/EmployeeNav'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useTranslation } from '@/components/providers/LanguageProvider'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'

const DESKTOP_NAV = [
  { href: '/my', labelKey: 'nav.today', icon: Home, exact: true },
  { href: '/my/schedule', labelKey: 'nav.schedule', icon: CalendarDays, exact: false },
  { href: '/my/tasks', labelKey: 'nav.tasks', icon: CheckSquare, exact: false },
  { href: '/my/leave', labelKey: 'nav.leave', icon: Home, exact: false },
  { href: '/my/swap', labelKey: 'nav.swap', icon: RefreshCcw, exact: false },
  { href: '/my/open-shifts', labelKey: 'nav.openShifts', icon: Building2, exact: false },
]

interface EmployeeShellProps {
  fullName: string
  companyName: string
  children: React.ReactNode
  unreadCount?: number
}

export function EmployeeShell({ fullName, companyName, children, unreadCount = 0 }: EmployeeShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { t } = useTranslation()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex min-h-screen bg-[#f8f9fa]">
      {/* Desktop oldalsáv */}
      <aside className="hidden md:flex flex-col w-64 min-h-screen bg-white border-r border-gray-100">
        {/* Logo + cégnév */}
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-[#1a5c3a] flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <div className="min-w-0">
              <span className="font-bold text-sm text-gray-900 block truncate">ShiftAssist</span>
              <span className="text-[11px] text-gray-400 truncate block">{companyName}</span>
            </div>
          </div>
        </div>

        {/* Navigáció */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {DESKTOP_NAV.map(({ href, labelKey, icon: Icon, exact }) => {
            const isActive = exact ? pathname === href : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#1a5c3a] text-white'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {t(labelKey)}
              </Link>
            )
          })}
        </nav>

        {/* Profil + kilépés */}
        <div className="px-3 py-4 border-t border-gray-100 space-y-1">
          <Link
            href="/my/availability"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              pathname.startsWith('/my/availability')
                ? 'bg-[#1a5c3a] text-white'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <CalendarDays className="h-4 w-4 flex-shrink-0" />
            {t('nav.availability')}
          </Link>
          <Link
            href="/my/notifications"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              pathname.startsWith('/my/notifications')
                ? 'bg-[#1a5c3a] text-white'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <div className="relative flex-shrink-0">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-4 w-4 flex items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            {t('nav.notifications')}
          </Link>
          <Link
            href="/my/profile"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              pathname.startsWith('/my/profile')
                ? 'bg-[#1a5c3a] text-white'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <UserCircle className="h-4 w-4 flex-shrink-0" />
            {t('nav.profile')}
          </Link>

          {/* Felhasználó info + nyelvváltó */}
          <div className="px-3 py-2 mt-1 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{fullName}</p>
              <p className="text-xs text-gray-400">{t('roles.employee')}</p>
            </div>
            <LanguageSwitcher variant="light" />
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-all"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {t('nav.logout')}
          </button>
        </div>
      </aside>

      {/* Mobil drawer */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <aside className="relative flex flex-col w-72 min-h-screen bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-5 border-b border-gray-100 flex items-center justify-between">
              <span className="font-bold text-gray-900">ShiftAssist</span>
              <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <Menu className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {DESKTOP_NAV.map(({ href, labelKey, icon: Icon, exact }) => {
                const isActive = exact ? pathname === href : pathname.startsWith(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-[#1a5c3a] text-white'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {t(labelKey)}
                  </Link>
                )
              })}
            </nav>
            <div className="px-3 py-4 border-t border-gray-100">
              <div className="px-3 flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-gray-900">{fullName}</p>
                <LanguageSwitcher variant="light" />
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-50 mt-1"
              >
                <LogOut className="h-4 w-4" />
                {t('nav.logout')}
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobil fejléc */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-[#1a5c3a] text-white sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Menü"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-bold text-base tracking-tight flex-1">ShiftAssist</span>
          <LanguageSwitcher variant="dark" />
          <Link href="/my/notifications" className="relative p-2 rounded-lg hover:bg-white/10 transition-colors">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-4 w-4 flex items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        </header>

        <main className="flex-1 overflow-auto pb-16 md:pb-0">
          {children}
        </main>
      </div>

      {/* Alsó navigáció mobilon */}
      <EmployeeNav />
    </div>
  )
}
