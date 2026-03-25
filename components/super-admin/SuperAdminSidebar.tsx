'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Building2, BarChart3, ScrollText, LogOut, X, Shield, Trash2, Users, TrendingUp, Megaphone } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const NAV_ITEMS = [
  { href: '/super-admin/dashboard', label: 'Irányítópult', icon: LayoutDashboard },
  { href: '/super-admin/companies', label: 'Cégek', icon: Building2 },
  { href: '/super-admin/admins', label: 'Adminok', icon: Users },
  { href: '/super-admin/revenue', label: 'Revenue', icon: TrendingUp },
  { href: '/super-admin/stats', label: 'Statisztikák', icon: BarChart3 },
  { href: '/super-admin/broadcast', label: 'Broadcast', icon: Megaphone },
  { href: '/super-admin/logs', label: 'Rendszer logok', icon: ScrollText },
  { href: '/super-admin/deletions', label: 'Törlési kérelmek', icon: Trash2 },
]

interface SuperAdminSidebarProps {
  fullName: string | null
  onClose?: () => void
}

export function SuperAdminSidebar({ fullName, onClose }: SuperAdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/super-admin/login')
  }

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-slate-900 text-white">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight block">ShiftAssist</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest">Super Admin</span>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="h-5 w-5 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* Navigáció */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Felhasználó + kilépés */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="px-3 py-2 mb-1">
          <p className="text-sm font-medium text-white truncate">{fullName ?? 'Super Admin'}</p>
          <p className="text-xs text-slate-500">Platform tulajdonos</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:bg-white/10 hover:text-white transition-all"
        >
          <LogOut className="h-4 w-4" />
          Kijelentkezés
        </button>
      </div>
    </aside>
  )
}
