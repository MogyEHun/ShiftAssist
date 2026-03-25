'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, CalendarDays, CheckSquare, Palmtree, User } from 'lucide-react'
import { useTranslation } from '@/components/providers/LanguageProvider'

export function EmployeeNav() {
  const pathname = usePathname()
  const { t } = useTranslation()

  const NAV_ITEMS = [
    { href: '/my', label: t('nav.today'), icon: Home, exact: true },
    { href: '/my/schedule', label: t('nav.schedule'), icon: CalendarDays, exact: false },
    { href: '/my/tasks', label: t('nav.tasks'), icon: CheckSquare, exact: false },
    { href: '/my/leave', label: t('nav.leave'), icon: Palmtree, exact: false },
    { href: '/my/profile', label: t('nav.profile'), icon: User, exact: false },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 md:hidden">
      <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors min-w-0 flex-1 ${
                isActive
                  ? 'text-[#1a5c3a]'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'fill-[#1a5c3a]/10' : ''}`} />
              <span className="text-[10px] font-medium leading-none truncate">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
