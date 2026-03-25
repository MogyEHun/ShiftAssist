'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, ArrowLeftRight, UmbrellaOff, Bot } from 'lucide-react'

const BOTTOM_NAV_ITEMS = [
  { href: '/dashboard/schedule', label: 'Beosztás', icon: CalendarDays },
  { href: '/dashboard/swap-requests', label: 'Csere', icon: ArrowLeftRight },
  { href: '/dashboard/leave', label: 'Szabadság', icon: UmbrellaOff },
  { href: '/dashboard/ai-assistant', label: 'Chat', icon: Bot },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-4 h-16">
        {BOTTOM_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors ${
                isActive ? 'text-[#1a5c3a]' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'text-[#1a5c3a]' : ''}`} />
              <span>{label}</span>
              {isActive && (
                <span className="absolute bottom-0 w-8 h-0.5 bg-[#1a5c3a] rounded-t-full" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
