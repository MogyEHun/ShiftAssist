'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getUserById } from '@/lib/data/users'
import { revalidatePath } from 'next/cache'

export interface TaskTemplate {
  id: string
  company_id: string
  title: string
  description: string | null
  recurrence: 'daily' | 'weekdays' | 'weekly'
  day_of_week: number | null
  is_active: boolean
  created_by: string
  created_at: string
}

export interface TaskTemplateWithCompletion extends TaskTemplate {
  completed: boolean  // mai napra elvégzve-e
}

async function getCurrentUser() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nincs bejelentkezve')
  const profile = await getUserById(user.id)
  if (!profile) throw new Error('Profil nem található')
  return profile
}

function isApplicableToday(template: TaskTemplate): boolean {
  const now = new Date()
  const dayOfWeek = (now.getDay() + 6) % 7  // 0=hétfő..6=vasárnap
  if (template.recurrence === 'daily') return true
  if (template.recurrence === 'weekdays') return dayOfWeek < 5
  if (template.recurrence === 'weekly') return template.day_of_week === dayOfWeek
  return false
}

// ------------------------------------------------------------
// Admin: sablonok lekérdezése
// ------------------------------------------------------------
export async function getTaskTemplates(): Promise<TaskTemplate[]> {
  try {
    const currentUser = await getCurrentUser()
    const admin = createAdminClient()
    const { data } = await admin
      .from('task_templates')
      .select('*')
      .eq('company_id', currentUser.company_id)
      .order('created_at', { ascending: true })
    return (data ?? []) as TaskTemplate[]
  } catch {
    return []
  }
}

// ------------------------------------------------------------
// Dolgozó: mai aktív sablonok + elvégzés státusz
// ------------------------------------------------------------
export async function getTodayTemplates(): Promise<TaskTemplateWithCompletion[]> {
  try {
    const currentUser = await getCurrentUser()
    const admin = createAdminClient()
    const today = new Date().toISOString().slice(0, 10)

    const [{ data: templates }, { data: completions }] = await Promise.all([
      admin
        .from('task_templates')
        .select('*')
        .eq('company_id', currentUser.company_id)
        .eq('is_active', true),
      admin
        .from('task_template_completions')
        .select('template_id')
        .eq('user_id', currentUser.id)
        .eq('date', today),
    ])

    const completedIds = new Set((completions ?? []).map(c => c.template_id))

    return (templates ?? [] as TaskTemplate[])
      .filter(t => isApplicableToday(t as TaskTemplate))
      .map(t => ({ ...t, completed: completedIds.has(t.id) })) as TaskTemplateWithCompletion[]
  } catch {
    return []
  }
}

// ------------------------------------------------------------
// Admin: sablon létrehozása
// ------------------------------------------------------------
export async function createTaskTemplate(payload: {
  title: string
  description?: string
  recurrence: 'daily' | 'weekdays' | 'weekly'
  day_of_week?: number
}): Promise<{ error?: string }> {
  try {
    const currentUser = await getCurrentUser()
    if (!['owner', 'admin', 'manager'].includes(currentUser.role)) return { error: 'forbidden' }
    const admin = createAdminClient()
    await admin.from('task_templates').insert({
      company_id: currentUser.company_id,
      created_by: currentUser.id,
      title: payload.title,
      description: payload.description ?? null,
      recurrence: payload.recurrence,
      day_of_week: payload.day_of_week ?? null,
    })
    revalidatePath('/dashboard/tasks')
    return {}
  } catch (e) {
    return { error: String(e) }
  }
}

// ------------------------------------------------------------
// Admin: sablon módosítása
// ------------------------------------------------------------
export async function updateTaskTemplate(
  id: string,
  patch: Partial<Pick<TaskTemplate, 'title' | 'description' | 'recurrence' | 'day_of_week' | 'is_active'>>
): Promise<{ error?: string }> {
  try {
    const currentUser = await getCurrentUser()
    if (!['owner', 'admin', 'manager'].includes(currentUser.role)) return { error: 'forbidden' }
    const admin = createAdminClient()
    await admin
      .from('task_templates')
      .update(patch)
      .eq('id', id)
      .eq('company_id', currentUser.company_id)
    revalidatePath('/dashboard/tasks')
    return {}
  } catch (e) {
    return { error: String(e) }
  }
}

// ------------------------------------------------------------
// Admin: sablon törlése
// ------------------------------------------------------------
export async function deleteTaskTemplate(id: string): Promise<{ error?: string }> {
  try {
    const currentUser = await getCurrentUser()
    if (!['owner', 'admin', 'manager'].includes(currentUser.role)) return { error: 'forbidden' }
    const admin = createAdminClient()
    await admin
      .from('task_templates')
      .delete()
      .eq('id', id)
      .eq('company_id', currentUser.company_id)
    revalidatePath('/dashboard/tasks')
    return {}
  } catch (e) {
    return { error: String(e) }
  }
}

// ------------------------------------------------------------
// Dolgozó: sablon feladat elvégzése (mai napra)
// ------------------------------------------------------------
export async function completeTaskTemplate(templateId: string): Promise<{ error?: string }> {
  try {
    const currentUser = await getCurrentUser()
    const admin = createAdminClient()
    const today = new Date().toISOString().slice(0, 10)
    await admin.from('task_template_completions').upsert(
      { template_id: templateId, user_id: currentUser.id, date: today },
      { onConflict: 'template_id,user_id,date' }
    )
    return {}
  } catch (e) {
    return { error: String(e) }
  }
}

// ------------------------------------------------------------
// Dolgozó: sablon feladat visszavonása (mai napra)
// ------------------------------------------------------------
export async function uncompleteTaskTemplate(templateId: string): Promise<{ error?: string }> {
  try {
    const currentUser = await getCurrentUser()
    const admin = createAdminClient()
    const today = new Date().toISOString().slice(0, 10)
    await admin
      .from('task_template_completions')
      .delete()
      .eq('template_id', templateId)
      .eq('user_id', currentUser.id)
      .eq('date', today)
    return {}
  } catch (e) {
    return { error: String(e) }
  }
}
