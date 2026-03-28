'use client'

import { useState } from 'react'
import { DashboardNav } from '@/components/layout/DashboardNav'
import { BottomNav } from '@/components/layout/BottomNav'
import { Sidebar } from '@/components/layout/Sidebar'
import { OnboardingTour } from '@/components/onboarding/OnboardingTour'

interface DashboardShellProps {
  companyName: string
  userFullName: string
  userRole: string
  children: React.ReactNode
}

export function DashboardShell({ companyName, userFullName, userRole, children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#f4f5f7]">
      <DashboardNav
        companyName={companyName}
        userFullName={userFullName}
        userRole={userRole}
      />

      {/* Fő tartalom — pt-14 hogy a fixed nav alatt kezdődjön */}
      <main className="pt-14 pb-16 md:pb-0 min-h-screen">
        {children}
      </main>

      {/* Mobil Sidebar drawer */}
      <Sidebar
        companyName={companyName}
        userFullName={userFullName}
        userRole={userRole}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Alsó navigáció mobilon */}
      <BottomNav onOpenMenu={() => setSidebarOpen(true)} />

      {/* Onboarding tour (csak owner/manager első belépésnél) */}
      <OnboardingTour userRole={userRole} />
    </div>
  )
}
