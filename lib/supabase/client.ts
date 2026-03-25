import { createBrowserClient } from '@supabase/ssr'

// Böngésző oldali Supabase kliens (Client Components-hez)
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
