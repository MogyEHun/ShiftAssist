'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createUserEncrypted, updateUserEncrypted } from '@/lib/data/users'
import { cookies } from 'next/headers'

// ============================================================
// Regisztráció
// ============================================================
export async function register(formData: FormData) {
  const companyName = formData.get('companyName') as string
  const fullName = formData.get('fullName') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const passwordConfirm = formData.get('passwordConfirm') as string

  // Validáció
  if (!companyName || !fullName || !email || !password) {
    return { error: 'Kérjük töltsd ki az összes mezőt.' }
  }
  if (password.length < 8) {
    return { error: 'A jelszónak legalább 8 karakter hosszúnak kell lennie.' }
  }
  if (password !== passwordConfirm) {
    return { error: 'A két jelszó nem egyezik meg.' }
  }

  const supabase = createClient()

  // 1. Auth felhasználó létrehozása
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, company_name: companyName },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })

  if (authError) {
    if (authError.message.includes('already registered')) {
      return { error: 'Ez az email cím már regisztrálva van.' }
    }
    return { error: 'Regisztrációs hiba: ' + authError.message }
  }

  if (!authData.user) {
    return { error: 'Ismeretlen hiba történt. Próbáld újra.' }
  }

  // 2. Cég és felhasználó rekordok létrehozása (service role-al, RLS megkerülve)
  const adminClient = createAdminClient()

  // Slug generálás a cégnévből
  const slug = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50) + '-' + Date.now().toString(36)

  // Cég létrehozása
  const { data: company, error: companyError } = await adminClient
    .from('companies')
    .insert({
      name: companyName,
      slug,
      subscription_plan: 'starter',
      subscription_status: 'trialing',
      max_employees: 15,
      timezone: 'Europe/Budapest',
    })
    .select()
    .single()

  if (companyError) {
    return { error: 'Hiba a cég létrehozásakor: ' + companyError.message }
  }

  // Felhasználó profil létrehozása (titkosítva)
  try {
    await createUserEncrypted({
      id: authData.user.id,
      companyId: company.id,
      fullName,
      email,
      role: 'owner',
    })
  } catch (err: any) {
    // Visszagörgetés: cég törlése ha a user insert sikertelen
    await adminClient.from('companies').delete().eq('id', company.id)
    return { error: 'Hiba a profil létrehozásakor: ' + err.message }
  }

  redirect('/verify-email')
}

// ============================================================
// Bejelentkezés
// ============================================================
export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Kérjük add meg az email címed és jelszavad.' }
  }

  const supabase = createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    if (error.message.includes('Email not confirmed')) {
      return { error: 'email_not_confirmed' }
    }
    if (error.message.includes('Invalid login credentials')) {
      return { error: 'Hibás email cím vagy jelszó.' }
    }
    return { error: 'Bejelentkezési hiba: ' + error.message }
  }

  // Email megerősítés ellenőrzése
  if (!data.user.email_confirmed_at) {
    return { error: 'email_not_confirmed' }
  }

  // 2FA ellenőrzés
  const adminClient2FA = createAdminClient()
  const { data: tfaSettings } = await adminClient2FA
    .from('two_factor_settings')
    .select('is_enabled')
    .eq('user_id', data.user.id)
    .eq('is_enabled', true)
    .single()

  if (tfaSettings) {
    const cookieStore = cookies()
    cookieStore.set('tfa_required', data.user.id, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
    })
    redirect('/auth/2fa-verify')
  }

  // Role alapú átirányítás
  const adminClient = createAdminClient()
  const { data: userData } = await adminClient
    .from('users')
    .select('role')
    .eq('id', data.user.id)
    .single()

  const role = userData?.role
  if (role === 'employee') redirect('/my')
  if (role === 'super_admin') redirect('/admin')
  redirect('/dashboard')
}

// ============================================================
// Kijelentkezés
// ============================================================
export async function logout() {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

// ============================================================
// Elfelejtett jelszó
// ============================================================
export async function forgotPassword(formData: FormData) {
  const email = formData.get('email') as string

  if (!email) {
    return { error: 'Kérjük add meg az email címed.' }
  }

  const supabase = createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/reset-password`,
  })

  if (error) {
    return { error: 'Hiba a jelszó visszaállítási email küldésekor.' }
  }

  return { success: true }
}

// ============================================================
// Jelszó visszaállítás
// ============================================================
// Profil frissítés
// ============================================================
export async function updateMyProfile(fullName: string): Promise<{ error?: string }> {
  if (!fullName.trim()) return { error: 'A név nem lehet üres.' }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nincs bejelentkezve.' }

  const { data: profile } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: 'Felhasználó nem található.' }

  const { error } = await updateUserEncrypted(user.id, profile.company_id, { fullName: fullName.trim() })
  if (error) return { error }
  return {}
}

// ============================================================
// Jelszó csere (bejelentkezve)
// ============================================================
export async function changePassword(newPassword: string): Promise<{ error?: string }> {
  if (!newPassword || newPassword.length < 8) return { error: 'A jelszónak legalább 8 karakter hosszúnak kell lennie.' }

  const supabase = createClient()
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { error: 'Hiba a jelszó frissítésekor: ' + error.message }
  return {}
}

// ============================================================
export async function resetPassword(formData: FormData) {
  const password = formData.get('password') as string
  const passwordConfirm = formData.get('passwordConfirm') as string

  if (!password || !passwordConfirm) {
    return { error: 'Kérjük töltsd ki az összes mezőt.' }
  }
  if (password.length < 8) {
    return { error: 'A jelszónak legalább 8 karakter hosszúnak kell lennie.' }
  }
  if (password !== passwordConfirm) {
    return { error: 'A két jelszó nem egyezik meg.' }
  }

  const supabase = createClient()

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { error: 'Hiba a jelszó frissítésekor: ' + error.message }
  }

  redirect('/dashboard')
}
