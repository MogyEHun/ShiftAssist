'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  CalendarDays,
  Users,
  UmbrellaOff,
  ClipboardList,
  LogOut,
  ChevronRight,
  X,
  Activity,
  UserCircle,
  Briefcase,
  ScrollText,
  Timer,
  BarChart2,
} from 'lucide-react'
import { logout } from '@/app/actions/auth'
import { useTranslation } from '@/components/providers/LanguageProvider'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'

const MAIN_ITEMS = [
  { href: '/dashboard', labelKey: 'nav.home', icon: CalendarDays, exact: true, roles: null },
  { href: '/dashboard/schedule', labelKey: 'nav.schedule', icon: CalendarDays, roles: null },
  { href: '/dashboard/staff', labelKey: 'nav.staff', icon: Users, roles: null },
  { href: '/dashboard/leave', labelKey: 'nav.leave', icon: UmbrellaOff, roles: null },
  { href: '/dashboard/open-shifts', labelKey: 'nav.openShifts', icon: Briefcase, roles: null },
  { href: '/dashboard/tasks', labelKey: 'nav.tasks', icon: ClipboardList, roles: null },
  { href: '/dashboard/attendance', labelKey: 'nav.attendance', icon: Timer, roles: ['owner', 'admin', 'manager'] },
  { href: '/dashboard/profile', labelKey: 'nav.profile', icon: UserCircle, roles: null },
]

const REPORT_ITEMS = [
  { href: '/dashboard/log', labelKey: 'nav.log', icon: ScrollText, roles: ['owner', 'admin', 'manager'] },
  { href: '/dashboard/activity', labelKey: 'nav.activity', icon: Activity, roles: ['owner', 'admin', 'manager'] },
  { href: '/dashboard/stats', labelKey: 'nav.stats', icon: BarChart2, roles: ['owner', 'admin', 'manager'] },
]

// NAV_ITEMS csak a típus-kompatibilitáshoz szükséges
const NAV_ITEMS = [...MAIN_ITEMS, ...REPORT_ITEMS]

const STORAGE_KEY = 'sidebar_nav_order_v2'

function canSeeItem(item: typeof NAV_ITEMS[0], userRole: string) {
  if (!item.roles) return true
  return item.roles.includes(userRole)
}

function loadOrder(): string[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return NAV_ITEMS.map(i => i.href)
}

function saveOrder(order: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(order))
  } catch {}
}

// ── Nav item megjelenítése (drag overlay-hez és sortable-hoz közös) ───────────
function NavItemContent({
  item, isActive, onClose, isDragging = false,
}: {
  item: typeof NAV_ITEMS[0]
  isActive: boolean
  onClose?: () => void
  isDragging?: boolean
}) {
  const { t } = useTranslation()
  const Icon = item.icon
  const label = t(item.labelKey)
  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
      isDragging
        ? 'bg-white/20 text-white shadow-lg'
        : isActive
        ? 'bg-white/15 text-white'
        : 'text-white/70'
    }`}>
      <Icon className="h-4 w-4 flex-shrink-0" />
      {isDragging ? (
        <span className="flex-1">{label}</span>
      ) : (
        <Link
          href={item.href}
          onClick={onClose}
          className="flex-1 flex items-center"
          draggable={false}
        >
          {label}
          {isActive && <ChevronRight className="h-3 w-3 ml-auto opacity-60" />}
        </Link>
      )}
    </div>
  )
}

// ── Sortable wrapper ─────────────────────────────────────────────────────────
function SortableNavItem({
  item, isActive, onClose,
}: {
  item: typeof NAV_ITEMS[0]
  isActive: boolean
  onClose?: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({ id: item.href })

  const style = {
    transform: CSS.Transform.toString(transform),
    // transition szándékosan nincs — az animáció a többi elemet lassítja
    opacity: isDragging ? 0 : 1,  // az eredeti elem eltűnik, DragOverlay veszi át
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing touch-none"
    >
      <NavItemContent item={item} isActive={isActive} onClose={onClose} />
    </div>
  )
}

// ── Main Sidebar ─────────────────────────────────────────────────────────────
interface SidebarProps {
  companyName: string
  userFullName: string
  userRole: string
  isOpen?: boolean
  onClose?: () => void
  mobileOnly?: boolean
}

export function Sidebar({ companyName, userFullName, userRole, isOpen = false, onClose, mobileOnly = false }: SidebarProps) {
  const pathname = usePathname()
  const [order, setOrder] = useState<string[]>(() => NAV_ITEMS.map(i => i.href))
  const [activeId, setActiveId] = useState<string | null>(null)
  const { t } = useTranslation()

  useEffect(() => {
    setOrder(loadOrder())
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return
    setOrder((prev) => {
      const oldIdx = prev.indexOf(active.id as string)
      const newIdx = prev.indexOf(over.id as string)
      const next = arrayMove(prev, oldIdx, newIdx)
      saveOrder(next)
      return next
    })
  }

  const roleLabel: Record<string, string> = {
    owner: t('roles.owner'),
    admin: t('roles.admin'),
    manager: t('roles.manager'),
    employee: t('roles.employee'),
  }

  const visibleMainItems = order
    .map(href => MAIN_ITEMS.find(i => i.href === href))
    .filter((item): item is typeof MAIN_ITEMS[0] => !!item && canSeeItem(item, userRole))

  const visibleReportItems = REPORT_ITEMS.filter(i => canSeeItem(i, userRole))

  const activeItem = activeId ? MAIN_ITEMS.find(i => i.href === activeId) : null

  const sidebarContent = (
    <aside className="flex flex-col w-64 min-h-screen bg-[#1a5c3a] text-white">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
              <CalendarDays className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">ShiftAssist</span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Menü bezárása"
            >
              <X className="h-5 w-5 text-white/70" />
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-white/60 truncate">{companyName}</p>
      </div>

      {/* Navigáció */}
      <nav className="flex-1 px-3 py-4 flex flex-col">
        {/* Főmenü – DnD-vel rendezhető */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={visibleMainItems.map(i => i.href)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1">
              {visibleMainItems.map((item) => {
                const isActive = 'exact' in item && item.exact ? pathname === item.href : pathname.startsWith(item.href)
                return (
                  <SortableNavItem
                    key={item.href}
                    item={item as typeof NAV_ITEMS[0]}
                    isActive={isActive}
                    onClose={onClose}
                  />
                )
              })}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeItem && (
              <NavItemContent item={activeItem as typeof NAV_ITEMS[0]} isActive={false} isDragging />
            )}
          </DragOverlay>
        </DndContext>

        {/* Riportok szekció – statikus */}
        {visibleReportItems.length > 0 && (
          <div className="mt-5">
            <p className="px-3 mb-1 text-[10px] font-semibold text-white/30 uppercase tracking-widest">Riportok</p>
            <div className="space-y-1">
              {visibleReportItems.map((item) => {
                const isActive = pathname.startsWith(item.href)
                return (
                  <NavItemContent
                    key={item.href}
                    item={item as typeof NAV_ITEMS[0]}
                    isActive={isActive}
                    onClose={onClose}
                  />
                )
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Felhasználó info + kijelentkezés */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="px-3 py-2 mb-1 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{userFullName}</p>
            <p className="text-xs text-white/50">{roleLabel[userRole] ?? userRole}</p>
          </div>
          <LanguageSwitcher variant="dark" />
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-white/70 hover:bg-white/10 hover:text-white transition-all"
          >
            <LogOut className="h-4 w-4" />
            {t('nav.logout')}
          </button>
        </form>
      </div>
    </aside>
  )

  return (
    <>
      {!mobileOnly && <div className="hidden md:flex">{sidebarContent}</div>}

      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex" onClick={onClose}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  )
}
