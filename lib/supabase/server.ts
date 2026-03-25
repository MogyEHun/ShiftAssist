import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Szerver oldali Supabase kliens (Server Components és Route Handlers-hez)
export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component-ből nem lehet cookie-t írni, ez elfogadható
          }
        },
      },
    }
  )
}
