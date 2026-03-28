'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, CalendarDays, UmbrellaOff, Users, Menu } from 'lucide-react'

const BOTTOM_NAV_ITEMS = [
  { href: '/dashboard', label: 'Főoldal', icon: Home, exact: true },
  { href: '/dashboard/schedule', label: 'Beosztás', icon: CalendarDays, exact: false },
  { href: '/dashboard/leave', label: 'Szabadság', icon: UmbrellaOff, exact: false },
  { href: '/dashboard/staff', label: 'Személyzet', icon: Users, exact: false },
]

interface BottomNavProps {
  onOpenMenu: () => void
}

export function BottomNav({ onOpenMenu }: BottomNavProps) {
  const pathname = usePathname()

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-5 h-16">
        {BOTTOM_NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors ${
                isActive ? 'text-[#1a5c3a]' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </Link>
          )
        })}
        <button
          onClick={onOpenMenu}
          className="flex flex-col items-center justify-center gap-1 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
        >
          <Menu className="h-5 w-5" />
          <span>Menü</span>
        </button>
      </div>
    </nav>
  )
}
