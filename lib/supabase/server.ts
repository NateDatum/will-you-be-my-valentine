import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseEnv } from '@/lib/env'

export async function createClient() {
  const cookieStore = await cookies()
  const { url, key } = supabaseEnv()
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(toSet) {
        try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }
        catch { /* Server Component render; the proxy refreshes the session */ }
      },
    },
  })
}
