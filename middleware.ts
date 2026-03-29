import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Publikus útvonalak – session nélkül is elérhetők
const PUBLIC_PREFIXES = [
  '/login',
  '/register',
  '/invite',
  '/api/invite',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/privacy',
  '/terms',
  '/auth/callback',
  '/auth/2fa-verify',
  '/admin/login',
  '/offline',
]

// --- Brute Force Protection ---
interface RateLimitEntry { count: number; resetAt: number }
const rateLimitMap = new Map<string, RateLimitEntry>()

function checkRateLimit(key: string, max: number, windowMs = 15 * 60 * 1000): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(key)
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= max) return false
  entry.count++
  return true
}

// --- CSRF Protection ---
function checkCsrf(request: NextRequest): boolean {
  const pathname = request.nextUrl.pathname
  // Stripe webhook és cron endpoint-ok mentesítve (saját aláírás-ellenőrzésük van)
  if (pathname.startsWith('/api/stripe/webhook')) return true
  if (pathname.startsWith('/api/cron/')) return true
  const method = request.method
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return true
  const origin = request.headers.get('origin')
  // Origin nélküli state-changing kérések blokkolva (subdomain CSRF bypass megelőzés)
  if (!origin) return false
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  const host = request.headers.get('host') || ''
  const allowedOrigins = [appUrl, `http://${host}`, `https://${host}`].filter(Boolean)
  // Exact origin match (URL.origin) – prefix match helyett (subdomain bypass elleni védelem)
  return allowedOrigins.some((allowed) => {
    try { return new URL(origin).origin === new URL(allowed).origin }
    catch { return false }
  })
}

function makeRedirect(pathname: string, request: NextRequest) {
  const url = request.nextUrl.clone()
  url.pathname = pathname
  return NextResponse.redirect(url)
}

export async function middleware(request: NextRequest) {
  const reqPath = request.nextUrl.pathname
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  // Rate limiting: meghívó token lekérés – 10/5min (token enumeration elleni védelem)
  if (reqPath.startsWith('/api/invite') && request.method === 'GET') {
    if (!checkRateLimit(`invite:${ip}`, 10, 5 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'Túl sok kísérlet. Próbáld újra 5 perc múlva.' },
        { status: 429, headers: { 'Retry-After': '300' } }
      )
    }
  }

  // Rate limiting: auth API (login) – 5/15min
  if (reqPath.startsWith('/api/auth')) {
    if (!checkRateLimit(`auth:${ip}`, 5)) {
      return NextResponse.json(
        { error: 'Túl sok kísérlet. Kérjük próbáld újra 15 perc múlva.' },
        { status: 429, headers: { 'Retry-After': '900' } }
      )
    }
  }

  // Rate limiting: jelszó reset – 3/15min
  if (reqPath.startsWith('/forgot-password') && request.method === 'POST') {
    if (!checkRateLimit(`reset:${ip}`, 3)) {
      return NextResponse.json(
        { error: 'Túl sok jelszó reset kísérlet. Kérjük próbáld újra 15 perc múlva.' },
        { status: 429, headers: { 'Retry-After': '900' } }
      )
    }
  }

  // Rate limiting: 2FA verify – 5/15min (brute force védelem)
  if (reqPath.startsWith('/auth/2fa-verify') && request.method === 'POST') {
    if (!checkRateLimit(`2fa:${ip}`, 5)) {
      return NextResponse.json(
        { error: 'Túl sok 2FA kísérlet. Kérjük próbáld újra 15 perc múlva.' },
        { status: 429, headers: { 'Retry-After': '900' } }
      )
    }
  }

  // CSRF ellenőrzés
  if (!checkCsrf(request)) {
    return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // Security headers minden válaszra
  supabaseResponse.headers.set('X-Content-Type-Options', 'nosniff')
  supabaseResponse.headers.set('X-Frame-Options', 'DENY')
  supabaseResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  supabaseResponse.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  // Content-Security-Policy (XSS védelem)
  supabaseResponse.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openai.com https://*.stripe.com",
      "frame-src https://*.stripe.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  )
  // HSTS – HTTPS kényszerítés (csak production, hogy dev ne törjön el)
  if (process.env.NODE_ENV === 'production') {
    supabaseResponse.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }

  // Publikus útvonalak átengedése
  const isPublic = PUBLIC_PREFIXES.some(p => pathname.startsWith(p)) || pathname === '/'
  if (isPublic) {
    // Ha be van jelentkezve és login/register oldalra megy → továbbirányítás
    if (user && (pathname.startsWith('/login') || pathname.startsWith('/register'))) {
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()
      const role = userData?.role
      if (role === 'super_admin') return makeRedirect('/admin', request)
      if (role === 'employee') return makeRedirect('/my', request)
      return makeRedirect('/dashboard', request)
    }
    return supabaseResponse
  }

  // Nincs session → /login
  if (!user) return makeRedirect('/login', request)

  // Email nincs megerősítve → /verify-email
  if (!user.email_confirmed_at) return makeRedirect('/verify-email', request)

  // 2FA ellenőrzés
  if (request.cookies.get('tfa_required')) {
    if (!pathname.startsWith('/auth/2fa-verify') && !pathname.startsWith('/api/')) {
      return makeRedirect('/auth/2fa-verify', request)
    }
    return supabaseResponse
  }

  // Role + onboarding + előfizetés lekérés (1 DB call)
  const { data: userData } = await supabase
    .from('users')
    .select('role, companies(onboarding_completed, subscription_status, trial_ends_at)')
    .eq('id', user.id)
    .single()

  const role = userData?.role as string | undefined
  const companyData = userData?.companies as {
    onboarding_completed?: boolean
    subscription_status?: string | null
    trial_ends_at?: string | null
  } | null
  const onboardingDone = companyData?.onboarding_completed

  // Super admin: csak /admin/* engedélyezett
  if (role === 'super_admin') {
    if (!pathname.startsWith('/admin')) return makeRedirect('/admin', request)
    return supabaseResponse
  }

  // Owner/Manager: /dashboard/* engedélyezett
  if (role === 'owner' || role === 'manager' || role === 'admin') {
    if (pathname.startsWith('/my')) return makeRedirect('/dashboard', request)
    if (pathname.startsWith('/admin')) return makeRedirect('/dashboard', request)
    if (pathname.startsWith('/dashboard') && !onboardingDone && pathname !== '/onboarding') {
      return makeRedirect('/onboarding', request)
    }

    // Előfizetés-ellenőrzés (csak dashboard útvonalakon, onboarding után)
    if (pathname.startsWith('/dashboard') && onboardingDone) {
      const status = companyData?.subscription_status
      const trialEndsAt = companyData?.trial_ends_at

      // Trial lejárt — csak ha trial_ends_at be van állítva (régi NULL fiókok nem érintett)
      const isTrialExpired =
        status === 'trialing' &&
        !!trialEndsAt &&
        new Date(trialEndsAt) < new Date()

      const isBlocked = isTrialExpired || status === 'canceled' || status === 'cancelled'

      // Billing oldal és profil beállítások mindig elérhetők (különben nem tudnak fizetni)
      const isAlwaysAllowed =
        pathname.startsWith('/dashboard/billing') ||
        pathname.startsWith('/dashboard/settings/profile')

      if (isBlocked && !isAlwaysAllowed) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard/billing'
        url.searchParams.set('reason', isTrialExpired ? 'trial_expired' : 'canceled')
        return NextResponse.redirect(url)
      }
    }

    return supabaseResponse
  }

  // Employee: csak /my/* engedélyezett
  if (role === 'employee') {
    if (pathname.startsWith('/dashboard')) return makeRedirect('/my', request)
    if (pathname.startsWith('/admin')) return makeRedirect('/my', request)
    if (pathname.startsWith('/onboarding')) return makeRedirect('/my', request)
    return supabaseResponse
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
