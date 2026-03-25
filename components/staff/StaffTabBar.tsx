'use client'

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Settings } from 'lucide-react'

interface DropdownItem {
  key: string
  label: string
}

interface Props {
  currentView: string
  dropdownItems: DropdownItem[]
}

export function StaffTabBar({ currentView, dropdownItems }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const isDropdownActive = dropdownItems.some(i => i.key === currentView)
  const activeDropdownLabel = dropdownItems.find(i => i.key === currentView)?.label

  return (
    <div className="flex items-center gap-2">
      {/* Személyzet – fő tab */}
      <div className="flex items-center p-1 bg-gray-100 rounded-lg border border-gray-200 w-fit">
        <Link
          href="/dashboard/staff"
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
            currentView === 'staff'
              ? 'bg-white text-[#1a5c3a] shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Személyzet
        </Link>
      </div>

      {/* Legördülő – Megbízhatóság / Állomások / Telephelyek */}
      {dropdownItems.length > 0 && (
        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
              isDropdownActive
                ? 'bg-[#1a5c3a] text-white border-[#1a5c3a]'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Settings className="h-4 w-4" />
            {isDropdownActive ? activeDropdownLabel : 'Kezelés'}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>

          {open && (
            <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 min-w-[160px]">
              {dropdownItems.map(item => (
                <Link
                  key={item.key}
                  href={`/dashboard/staff?view=${item.key}`}
                  onClick={() => setOpen(false)}
                  className={`block px-4 py-2 text-sm transition-colors ${
                    currentView === item.key
                      ? 'bg-[#f0faf4] text-[#1a5c3a] font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
