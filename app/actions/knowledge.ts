'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { CompanyKnowledge } from '@/types'
import { revalidatePath } from 'next/cache'

async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nincs bejelentkezve')

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) throw new Error('Profil nem található')
  return { user, profile }
}

export async function getKnowledge(): Promise<CompanyKnowledge[]> {
  const { profile } = await getCurrentUser()
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data } = await admin
    .from('company_knowledge')
    .select('*')
    .eq('company_id', profile.company_id)
    .order('created_at', { ascending: false })

  return data ?? []
}

export async function createKnowledge(
  title: string,
  content: string,
  category: string
): Promise<CompanyKnowledge> {
  const { profile } = await getCurrentUser()
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await admin
    .from('company_knowledge')
    .insert({ title, content, category, company_id: profile.company_id })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/ai-assistant/knowledge')
  return data
}

export async function updateKnowledge(
  id: string,
  payload: Partial<{ title: string; content: string; category: string }>
): Promise<void> {
  const { profile } = await getCurrentUser()
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await admin
    .from('company_knowledge')
    .update(payload)
    .eq('id', id)
    .eq('company_id', profile.company_id)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/ai-assistant/knowledge')
}

export async function deleteKnowledge(id: string): Promise<void> {
  const { profile } = await getCurrentUser()
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await admin
    .from('company_knowledge')
    .delete()
    .eq('id', id)
    .eq('company_id', profile.company_id)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/ai-assistant/knowledge')
}
