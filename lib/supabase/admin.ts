import { createClient } from '@supabase/supabase-js'

// Admin kliens service role kulcsal — CSAK szerver oldalon használd!
// Megkerüli az RLS szabályokat, ezért soha ne add át kliensnek!
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
