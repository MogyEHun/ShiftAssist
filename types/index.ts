// ============================================================
// ShiftSync - Globális TypeScript típusok
// ============================================================

// Felhasználói szerepkörök
export type UserRole = 'owner' | 'admin' | 'manager' | 'employee'

// Cég típus és méret
export type CompanyType = 'restaurant' | 'bar' | 'hotel' | 'other'
export type CompanySize = 'small' | 'medium' | 'large'

// Előfizetési tervek
export type SubscriptionPlan = 'basic' | 'premium'
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing'

// Műszak típusok
export type ShiftType = 'fixed' | 'flexible'
export type ShiftStatus = 'draft' | 'published' | 'cancelled' | 'swappable' | 'open'
export type LogbookCategory = 'normal' | 'problem' | 'important'

// Csereigény státuszok
export type SwapRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

// Szabadságkérelem típusok
export type LeaveType = 'vacation' | 'sick' | 'personal' | 'other'
export type LeaveStatus = 'pending' | 'approved' | 'rejected'

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  vacation: 'Fizetett szabadság',
  sick: 'Betegszabadság',
  personal: 'Fizetetlen szabadság',
  other: 'Egyéb',
}

export const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
  pending: 'Függőben',
  approved: 'Elfogadva',
  rejected: 'Elutasítva',
}

export const LEAVE_STATUS_COLORS: Record<LeaveStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-[#1a5c3a]/10 text-[#1a5c3a]',
  rejected: 'bg-gray-100 text-gray-500',
}

// ------------------------------------------------------------
// Adatbázis entitások
// ------------------------------------------------------------

export interface Company {
  id: string
  name: string
  slug: string
  logo_url: string | null
  type: CompanyType
  size: CompanySize
  onboarding_completed: boolean
  subscription_plan: SubscriptionPlan
  subscription_status: SubscriptionStatus
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  max_employees: number
  timezone: string
  created_at: string
  updated_at: string
}

export interface Position {
  id: string
  company_id: string
  name: string
  created_at: string
  updated_at: string
}

export interface Invitation {
  id: string
  company_id: string
  email: string
  role: 'manager' | 'employee'
  position_id: string | null
  hourly_rate: number | null
  token: string
  invited_by: string
  accepted_at: string | null
  expires_at: string
  created_at: string
  position?: Position
}

export interface Station {
  id: string
  company_id: string
  name: string
  color: string
  created_at: string
}

export interface Site {
  id: string
  company_id: string
  name: string
  address: string | null
  manager_id: string | null
  created_at: string
}

export interface User {
  id: string
  company_id: string
  email: string
  full_name: string
  avatar_url: string | null
  role: UserRole
  phone: string | null
  position: string | null  // Munkakör (pl. "Pincér", "Szakács")
  hourly_rate: number | null
  daily_rate: number | null
  pay_type: 'hourly' | 'daily'
  is_active: boolean
  birth_date?: string | null
  site_id: string | null
  created_at: string
  updated_at: string
}

export interface Shift {
  id: string
  company_id: string
  user_id: string | null   // null = betöltetlen műszak
  title: string
  type: ShiftType
  status: ShiftStatus
  start_time: string       // ISO 8601
  end_time: string         // ISO 8601
  location: string | null
  station_id: string | null
  notes: string | null
  required_position: string | null
  break_minutes: number
  created_by: string       // user_id
  created_at: string
  updated_at: string
  // Joined adatok
  user?: User
}

export interface ShiftSwapRequest {
  id: string
  company_id: string
  requester_id: string     // Aki kéri a cserét
  target_user_id: string | null  // Akivel cserélne (null = bárki)
  shift_id: string         // Cserélni kívánt műszak
  target_shift_id: string | null // Amit kapna cserébe
  status: SwapRequestStatus
  message: string | null
  manager_note: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
  // Joined adatok
  requester?: User
  target_user?: User
  shift?: Shift
  target_shift?: Shift
}

export interface LeaveRequest {
  id: string
  company_id: string
  user_id: string
  type: LeaveType
  status: LeaveStatus
  start_date: string       // YYYY-MM-DD
  end_date: string         // YYYY-MM-DD
  reason: string | null
  manager_note: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
  // Joined adatok
  user?: User
}

export interface Task {
  id: string
  company_id: string
  shift_id: string | null  // Melyik műszakhoz tartozik
  assigned_to: string | null
  title: string
  description: string | null
  is_completed: boolean
  completed_at: string | null
  due_date: string | null
  created_by: string
  created_at: string
  updated_at: string
  // Joined adatok
  assigned_user?: User
}

export interface CompanyKnowledge {
  id: string
  company_id: string
  title: string
  content: string          // AI által kereshető szöveg
  category: string | null  // pl. "szabályzat", "folyamat", "termék"
  created_by: string
  created_at: string
  updated_at: string
}

// ------------------------------------------------------------
// Beosztás tervező típusok
// ------------------------------------------------------------

// Műszak dolgozó adatokkal együtt (JOIN)
export interface ShiftWithAssignee extends Shift {
  assignee: User | null
  swap_request?: ShiftSwapRequest | null
}

// Heti beosztás adatok (szerver → kliens)
export interface WeeklyScheduleData {
  shifts: ShiftWithAssignee[]
  employees: (Omit<User, 'role'> & { role: string })[]
  weekStart: string   // ISO dátum (hétfő)
  weekEnd: string     // ISO dátum (vasárnap)
  positions: Position[]
  weeklyHoursPerUser: Record<string, number>  // user_id → heti összes perc
  overtimeConfig: OvertimeConfig | null
  availabilities: Availability[]
  availabilityDates: AvailabilityDate[]
  approvedLeaves: LeaveRequest[]
  stations: Station[]
  sites: Site[]
  isMultiSite: boolean   // true ha ≥1 telephely van (multi-site mód)
}

// Drag & drop adat
export interface DragPayload {
  shiftId: string
  sourceUserId: string | null
  sourceDateISO: string  // YYYY-MM-DD
}

// AI műszakjavaslat (csak kliens oldali, nem kerül DB-be)
export interface AiShiftSuggestion {
  suggestion_id: string
  user_id: string | null
  start_time: string
  end_time: string
  required_position: string | null
  notes: string | null
}

// Reducer akciók optimista frissítéshez
export type ScheduleAction =
  | { type: 'MOVE_SHIFT'; shiftId: string; newUserId: string | null; newStartTime: string; newEndTime: string; newStatus?: string }
  | { type: 'ROLLBACK'; shifts: ShiftWithAssignee[] }
  | { type: 'ADD_SHIFT'; shift: ShiftWithAssignee }
  | { type: 'UPDATE_SHIFT'; shift: ShiftWithAssignee }
  | { type: 'DELETE_SHIFT'; shiftId: string }
  | { type: 'SET_SUGGESTIONS'; suggestions: AiShiftSuggestion[] }
  | { type: 'ACCEPT_ALL_SUGGESTIONS' }
  | { type: 'CLEAR_SUGGESTIONS' }

// Új műszak létrehozási adatok
export interface CreateShiftPayload {
  user_id: string | null
  start_time: string    // ISO 8601
  end_time: string      // ISO 8601
  required_position: string | null
  status: ShiftStatus
  notes: string | null
  title: string
  type: ShiftType
  station_id?: string | null
}

// Magyar státusz megnevezések
export const SHIFT_STATUS_LABELS: Record<ShiftStatus, string> = {
  published: 'Fixálva',
  swappable: 'Cserélhető',
  draft: 'Tervezet',
  cancelled: 'Törölve',
  open: 'Szabad műszak',
}

export const SHIFT_STATUS_COLORS: Record<ShiftStatus, string> = {
  published: 'bg-white border border-[#1a5c3a] text-[#1a5c3a]',
  swappable: 'bg-[#d4a017] text-white',
  draft: 'bg-gray-200 text-gray-700',
  cancelled: 'bg-red-100 text-red-600 line-through',
  open: 'bg-blue-100 text-blue-700',
}

export const LOGBOOK_CATEGORY_LABELS: Record<LogbookCategory, string> = {
  normal: 'Normál',
  problem: 'Probléma volt',
  important: 'Fontos infó',
}

export const LOGBOOK_CATEGORY_COLORS: Record<LogbookCategory, string> = {
  normal: 'bg-gray-100 text-gray-700',
  problem: 'bg-red-100 text-red-700',
  important: 'bg-amber-100 text-amber-700',
}

// ------------------------------------------------------------
// Új entitás interfészek
// ------------------------------------------------------------

export interface ChatMessage {
  id: string
  company_id: string
  user_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface Availability {
  id: string
  company_id: string
  user_id: string
  day_of_week: number  // 0=Hétfő, 6=Vasárnap
  from_time: string | null
  to_time: string | null
  max_days_per_week: number | null
  valid_from: string | null
  valid_until: string | null
  note: string | null
  created_at: string
}

export type AvailabilityStatus = 'available' | 'partial' | 'unavailable'

export interface AvailabilityDate {
  id: string
  company_id: string
  user_id: string
  date: string  // YYYY-MM-DD
  status: AvailabilityStatus
  from_time: string | null
  to_time: string | null
  note: string | null
  created_at: string
}

export interface AuditLog {
  id: string
  company_id: string
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  created_at: string
  user?: User
}

export interface ShiftTemplate {
  id: string
  company_id: string
  name: string
  day_of_week: number | null
  start_time: string
  end_time: string
  position: string | null
  created_by: string | null
  created_at: string
}

export interface Department {
  id: string
  company_id: string
  name: string
  color: string
  created_at: string
  memberIds?: string[]
}

export interface OvertimeConfig {
  id: string
  company_id: string
  weekly_hour_warning: number
  weekly_hour_max: number
  created_at: string
}

export interface ClockEntry {
  id: string
  company_id: string
  user_id: string
  site_id: string | null
  clock_in_at: string
  clock_out_at: string | null
  lat_in: number | null
  lon_in: number | null
  lat_out: number | null
  lon_out: number | null
  created_at: string
  user?: User
}

// ------------------------------------------------------------
// Shift Checklist típusok
// ------------------------------------------------------------

export interface ChecklistTemplate {
  id: string
  company_id: string
  name: string
  trigger: 'shift_start' | 'shift_end'
  is_active: boolean
  created_at: string
  items?: ChecklistItem[]
}

export interface ChecklistItem {
  id: string
  template_id: string
  label: string
  order_index: number
}

export interface ChecklistItemWithStatus extends ChecklistItem {
  completed: boolean
}

export interface ChecklistCompletion {
  id: string
  item_id: string
  user_id: string
  shift_date: string
  completed_at: string
}
