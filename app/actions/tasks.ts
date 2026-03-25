'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getUserById, getCompanyUsers } from '@/lib/data/users'
import { sendTaskAssignedNotification } from './notifications'
import { logAudit } from './audit'

export interface AssignedUser {
  id: string
  full_name: string
  position: string | null
  avatar_url: string | null
}

export interface TaskWithUsers {
  id: string
  company_id: string
  title: string
  description: string | null
  status: 'pending' | 'done'
  priority: 'normal' | 'high'
  due_date: string | null
  assigned_to_ids: string[]
  created_by: string
  created_at: string
  assigned_users: AssignedUser[]
}

async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nem vagy bejelentkezve')
  const profile = await getUserById(user.id)
  if (!profile) throw new Error('Profil nem található')
  return profile
}

// ── Feladatok lekérdezése ────────────────────────────────────────────
export async function getTasks(): Promise<TaskWithUsers[]> {
  const currentUser = await getCurrentUser()
  const isManager = ['owner', 'admin', 'manager'].includes(currentUser.role)
  const admin = createAdminClient()

  let rawData: any[] | null = null

  if (isManager) {
    const { data, error } = await admin
      .from('tasks')
      .select('*')
      .eq('company_id', currentUser.company_id)
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    rawData = data
  } else {
    // RPC-vel kerüljük meg a PostgREST schema cache problémát az UUID[] contains szűrőnél
    const { data, error } = await admin.rpc('get_tasks_for_user', {
      p_company_id: currentUser.company_id,
      p_user_id: currentUser.id,
    })
    if (error) {
      console.error('[tasks] get_tasks_for_user hiba:', error.message)
      rawData = []
    } else {
      rawData = data
    }
  }

  const companyUsers = await getCompanyUsers(currentUser.company_id)
  const userMap = Object.fromEntries(companyUsers.map(u => [u.id, u]))

  return (rawData || []).map((t: any) => ({
    ...t,
    assigned_to_ids: t.assigned_to_ids ?? [],
    assigned_users: (t.assigned_to_ids ?? [])
      .map((uid: string) => userMap[uid])
      .filter(Boolean)
      .map((u: any) => ({
        id: u.id,
        full_name: u.full_name,
        position: u.position,
        avatar_url: u.avatar_url,
      })),
  }))
}

// ── Feladat létrehozása (egy rekord, több hozzárendelttel) ───────────
export async function createTask(payload: {
  title: string
  description: string | null
  due_date: string | null
  priority: 'normal' | 'high'
  assignedUserIds: string[]
}): Promise<{ error: string | null }> {
  try {
    const currentUser = await getCurrentUser()
    if (!['owner', 'admin', 'manager'].includes(currentUser.role)) {
      return { error: 'Nincs jogosultságod feladat létrehozásához' }
    }

    const admin = createAdminClient()
    // RPC-vel kerüljük meg a PostgREST schema cache problémát az UUID[] típusnál
    const { data, error } = await admin.rpc('create_task_record', {
      p_company_id: currentUser.company_id,
      p_title: payload.title,
      p_description: payload.description ?? null,
      p_due_date: payload.due_date ?? '',
      p_priority: payload.priority,
      p_assigned_ids: payload.assignedUserIds,
      p_assigned_to: payload.assignedUserIds[0] ?? null,
      p_created_by: currentUser.id,
    })

    if (error) return { error: error.message }

    await logAudit(currentUser.company_id, currentUser.id, 'task.create', 'task', data.id, null, {
      title: data.title,
      priority: data.priority,
      due_date: data.due_date,
      assigned_count: payload.assignedUserIds.length,
    })

    // Push értesítés az összes hozzárendelt személynek
    if (payload.assignedUserIds.length > 0) {
      const companyUsers = await getCompanyUsers(currentUser.company_id)
      const userMap = Object.fromEntries(companyUsers.map(u => [u.id, u]))
      await Promise.allSettled(
        payload.assignedUserIds.map(userId => {
          const emp = userMap[userId]
          if (emp) return sendTaskAssignedNotification(emp, data)
        })
      )
    }

    revalidatePath('/dashboard/tasks')
    revalidatePath('/my/tasks')
    return { error: null }
  } catch (e: any) {
    return { error: e.message || 'Ismeretlen hiba' }
  }
}

// ── Feladat státusz váltás ───────────────────────────────────────────
// Ha bárki kész jelöli → az egész feladat kész
export async function toggleTask(id: string): Promise<{ error: string | null }> {
  try {
    const currentUser = await getCurrentUser()
    const admin = createAdminClient()

    const { data: task } = await admin
      .from('tasks')
      .select('status, title, assigned_to_ids, company_id')
      .eq('id', id)
      .single()

    if (!task) return { error: 'Feladat nem található' }
    if (task.company_id !== currentUser.company_id) return { error: 'Hozzáférés megtagadva' }

    const isManager = ['owner', 'admin', 'manager'].includes(currentUser.role)
    const isAssigned = (task.assigned_to_ids ?? []).includes(currentUser.id)
    if (!isManager && !isAssigned) return { error: 'Nincs jogosultságod' }

    const newStatus = task.status === 'done' ? 'pending' : 'done'
    const { error } = await admin
      .from('tasks')
      .update({
        status: newStatus,
        completed_at: newStatus === 'done' ? new Date().toISOString() : null,
        is_completed: newStatus === 'done',
      })
      .eq('id', id)

    if (error) return { error: error.message }

    const auditAction = newStatus === 'done' ? 'task.complete' : 'task.reopen'
    await logAudit(currentUser.company_id, currentUser.id, auditAction, 'task', id, null, { title: task.title, status: newStatus })

    revalidatePath('/dashboard/tasks')
    revalidatePath('/my/tasks')
    return { error: null }
  } catch (e: any) {
    return { error: e.message || 'Ismeretlen hiba' }
  }
}

// ── Feladat törlése ──────────────────────────────────────────────────
export async function deleteTask(id: string): Promise<{ error: string | null }> {
  try {
    const currentUser = await getCurrentUser()
    if (!['owner', 'admin', 'manager'].includes(currentUser.role)) {
      return { error: 'Nincs jogosultságod' }
    }
    const admin = createAdminClient()
    const { data: taskToDelete } = await admin
      .from('tasks')
      .select('title')
      .eq('id', id)
      .eq('company_id', currentUser.company_id)
      .single()

    const { error } = await admin
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('company_id', currentUser.company_id)

    if (error) return { error: error.message }

    await logAudit(currentUser.company_id, currentUser.id, 'task.delete', 'task', id, { title: taskToDelete?.title ?? '' }, null)

    revalidatePath('/dashboard/tasks')
    revalidatePath('/my/tasks')
    return { error: null }
  } catch (e: any) {
    return { error: e.message || 'Ismeretlen hiba' }
  }
}
