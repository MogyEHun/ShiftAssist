'use client'

import { useState } from 'react'
import { Menu, Shield } from 'lucide-react'
import { SuperAdminSidebar } from '@/components/super-admin/SuperAdminSidebar'

interface SuperAdminShellProps {
  fullName: string | null
  children: React.ReactNode
}

export function SuperAdminShell({ fullName, children }: SuperAdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Asztali sidebar */}
      <div className="hidden md:flex">
        <SuperAdminSidebar fullName={fullName} />
      </div>

      {/* Mobil drawer */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <SuperAdminSidebar fullName={fullName} onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobil fejléc */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-slate-900 text-white sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Shield className="h-4 w-4 text-blue-400" />
          <span className="font-bold text-sm">Super Admin</span>
        </header>

        {/* Tartalom */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
