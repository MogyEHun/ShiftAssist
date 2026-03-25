import type { User } from '@/types'

// Role-based typed response objects (1.3)
// Ensures sensitive fields (hourly_rate) don't leak to unauthorized roles

export type EmployeeView = {
  id: string
  full_name: string
  position: string | null
  role: string
}

export type ManagerView = EmployeeView & {
  email: string
  phone: string | null
  is_active: boolean
}

export type OwnerView = ManagerView & {
  hourly_rate: number | null
  created_at: string
}

export function filterUserForRole(user: User, viewerRole: string): EmployeeView | ManagerView | OwnerView {
  if (viewerRole === 'owner' || viewerRole === 'admin') {
    return {
      id: user.id,
      full_name: user.full_name,
      position: user.position ?? null,
      role: user.role,
      email: user.email,
      phone: user.phone ?? null,
      is_active: user.is_active,
      hourly_rate: user.hourly_rate ?? null,
      created_at: user.created_at,
    } as OwnerView
  }

  if (viewerRole === 'manager') {
    return {
      id: user.id,
      full_name: user.full_name,
      position: user.position ?? null,
      role: user.role,
      email: user.email,
      phone: user.phone ?? null,
      is_active: user.is_active,
    } as ManagerView
  }

  return {
    id: user.id,
    full_name: user.full_name,
    position: user.position ?? null,
    role: user.role,
  } as EmployeeView
}

export function filterUsersForRole(
  users: User[],
  viewerRole: string
): (EmployeeView | ManagerView | OwnerView)[] {
  return users.map((u) => filterUserForRole(u, viewerRole))
}
