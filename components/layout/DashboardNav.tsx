'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, LogOut, Settings } from 'lucide-react'
import { logout } from '@/app/actions/auth'
import { useTranslation } from '@/components/providers/LanguageProvider'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'

const NAV_LINKS: { href: string; key: string; exact?: boolean; roles?: string[] | null }[] = [
  { href: '/dashboard', key: 'nav.home', exact: true, roles: null },
  { href: '/dashboard/schedule', key: 'nav.schedule', roles: null },
  { href: '/dashboard/leave', key: 'nav.leave', roles: null },
  { href: '/dashboard/attendance', key: 'nav.attendance', roles: ['owner', 'admin', 'manager'] },
]

const STAFF_ITEMS: { href: string; view: string; label: string; roles: string[] | null }[] = [
  { href: '/dashboard/staff', view: '', label: 'Személyzet', roles: null },
  { href: '/dashboard/tasks', view: 'tasks', label: 'Feladatok', roles: null },
  { href: '/dashboard/staff?view=reliability', view: 'reliability', label: 'Megbízhatóság', roles: ['owner', 'admin', 'manager'] },
  { href: '/dashboard/staff?view=stations', view: 'stations', label: 'Állomások', roles: ['owner', 'admin', 'manager'] },
  { href: '/dashboard/staff?view=sites', view: 'sites', label: 'Telephelyek', roles: ['owner', 'admin'] },
]

const REPORT_ITEMS: { href: string; key: string; roles: string[] }[] = [
  { href: '/dashboard/log', key: 'nav.log', roles: ['owner', 'admin', 'manager'] },
  { href: '/dashboard/stats', key: 'nav.stats', roles: ['owner', 'admin', 'manager'] },
]

interface DashboardNavProps {
  companyName: string
  userFullName: string
  userRole: string
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

export function DashboardNav({ companyName, userFullName, userRole }: DashboardNavProps) {
  const pathname = usePathname()
  const [staffView, setStaffView] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [reportsOpen, setReportsOpen] = useState(false)
  const [staffOpen, setStaffOpen] = useState(false)
  const { t } = useTranslation()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setStaffView(params.get('view') ?? '')
  }, [pathname])

  const visibleStaff = STAFF_ITEMS.filter(i => !i.roles || i.roles.includes(userRole))
  const visibleReports = REPORT_ITEMS.filter(i => i.roles.includes(userRole))
  const staffActive = pathname.startsWith('/dashboard/staff') || pathname.startsWith('/dashboard/tasks')
  const reportsActive = visibleReports.some(i => pathname.startsWith(i.href))

  const linkCls = (active: boolean) =>
    `px-3 py-1.5 text-sm font-medium rounded-md transition-all relative select-none ${
      active
        ? 'text-white after:absolute after:bottom-[-12px] after:left-0 after:right-0 after:h-0.5 after:bg-white after:rounded-t'
        : 'text-white/70 hover:text-white hover:bg-white/10'
    }`

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#1a5c3a] h-14 flex items-center px-4 gap-1">
      {/* Logo */}
      <Link
        href="/dashboard"
        className="font-bold text-white text-lg tracking-tight flex-shrink-0 hover:opacity-90 transition-opacity mr-3"
      >
        ShiftAssist
      </Link>

      {/* Nav */}
      <nav className="hidden md:flex items-center gap-1 flex-1">
        {/* Regular links */}
        {NAV_LINKS.filter(l => !l.roles || l.roles.includes(userRole)).map(link => (
          <Link
            key={link.href}
            href={link.href}
            className={linkCls(link.exact ? pathname === link.href : pathname.startsWith(link.href))}
          >
            {t(link.key)}
          </Link>
        ))}

        {/* Személyzet dropdown */}
        {visibleStaff.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setStaffOpen(v => !v)}
              className={linkCls(staffActive)}
            >
              {t('nav.staff')}
              <ChevronDown className={`inline-block ml-1 h-3.5 w-3.5 transition-transform ${staffOpen ? 'rotate-180' : ''}`} />
            </button>
            {staffOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setStaffOpen(false)} />
                <div className="absolute top-full left-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20">
                  {visibleStaff.map(item => (
                    <Link
                      key={item.view}
                      href={item.href}
                      onClick={() => setStaffOpen(false)}
                      className={`block px-4 py-2 text-sm transition-colors ${
                        (item.view === 'tasks' ? pathname.startsWith('/dashboard/tasks') : pathname === '/dashboard/staff' && staffView === item.view)
                          ? 'text-[#1a5c3a] font-medium bg-[#1a5c3a]/5'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Riportok dropdown */}
        {visibleReports.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setReportsOpen(v => !v)}
              className={linkCls(reportsActive)}
            >
              Riportok
              <ChevronDown className={`inline-block ml-1 h-3.5 w-3.5 transition-transform ${reportsOpen ? 'rotate-180' : ''}`} />
            </button>
            {reportsOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setReportsOpen(false)} />
                <div className="absolute top-full left-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20">
                  {visibleReports.map(item => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setReportsOpen(false)}
                      className={`block px-4 py-2 text-sm transition-colors ${
                        pathname.startsWith(item.href)
                          ? 'text-[#1a5c3a] font-medium bg-[#1a5c3a]/5'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {t(item.key)}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </nav>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-2 relative">
        <LanguageSwitcher variant="dark" />

        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
        >
          <span className="hidden sm:block text-sm font-medium truncate max-w-[140px]">{companyName}</span>
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 text-white text-xs font-bold flex-shrink-0">
            {getInitials(userFullName)}
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {dropdownOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
            <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900 truncate">{userFullName}</p>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{companyName}</p>
              </div>
              <Link
                href="/dashboard/settings"
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => setDropdownOpen(false)}
              >
                <Settings className="h-4 w-4 text-gray-400" />
                {t('nav.settings')}
              </Link>
              <div className="border-t border-gray-100 mt-1 pt-1">
                <form action={logout}>
                  <button
                    type="submit"
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    {t('nav.logout')}
                  </button>
                </form>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
