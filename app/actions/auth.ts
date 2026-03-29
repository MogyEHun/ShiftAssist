'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createUserEncrypted, updateUserEncrypted } from '@/lib/data/users'
import { cookies } from 'next/headers'

// Erős jelszó validáció: min 10 karakter, nagy- és kisbetű, szám kötelező
function validatePassword(password: string): string | null {
  if (password.length < 10) return 'A jelszónak legalább 10 karakter hosszúnak kell lennie.'
  if (!/[A-Z]/.test(password)) return 'Tartalmaznia kell legalább egy nagybetűt (A–Z).'
  if (!/[a-z]/.test(password)) return 'Tartalmaznia kell legalább egy kisbetűt (a–z).'
  if (!/[0-9]/.test(password)) return 'Tartalmaznia kell legalább egy számot (0–9).'
  return null
}

// ============================================================
// Regisztráció
// ============================================================
export async function register(formData: FormData) {
  // Stripe konfigurációs kapu — ha nincs bekötve a fizetés, a regisztráció le van tiltva
  const stripeKey = process.env.STRIPE_SECRET_KEY
  const stripePubKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  const isStripeReady = !!(
    stripeKey && !stripeKey.startsWith('sk_test_your') &&
    stripePubKey && !stripePubKey.startsWith('pk_test_your')
  )
  if (!isStripeReady) {
    return { error: 'A regisztráció jelenleg nem elérhető. Kérjük lépj kapcsolatba velünk a hozzáférésért.' }
  }

  const companyName = formData.get('companyName') as string
  const fullName = formData.get('fullName') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const passwordConfirm = formData.get('passwordConfirm') as string

  // Validáció
  if (!companyName || !fullName || !email || !password) {
    return { error: 'Kérjük töltsd ki az összes mezőt.' }
  }
  const pwError = validatePassword(password)
  if (pwError) return { error: pwError }
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
      trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
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
  if (!newPassword) return { error: 'A jelszó nem lehet üres.' }
  const pwError = validatePassword(newPassword)
  if (pwError) return { error: pwError }

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
  const pwErr = validatePassword(password)
  if (pwErr) return { error: pwErr }
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
