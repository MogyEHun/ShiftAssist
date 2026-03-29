import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Supabase Auth callback — PKCE code csere sessionre
// Email megerősítés és jelszó visszaállítás után ide irányít a Supabase
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Open redirect védelem: csak relatív, saját domainre mutató URL engedélyezett
  const nextRaw = searchParams.get('next') ?? '/dashboard'
  const next = nextRaw.startsWith('/') && !nextRaw.includes('://') ? nextRaw : '/dashboard'

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Hiba esetén visszairányítás a login oldalra hibaüzenettel
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
