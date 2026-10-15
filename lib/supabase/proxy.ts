import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseEnv } from '@/lib/env'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const { url, key } = supabaseEnv()
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(toSet) {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })
  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const target =
    path === '/' ? (user ? '/dashboard' : '/login')
    : !user && (path.startsWith('/dashboard') || path.startsWith('/create')) ? '/login'
    : user && path === '/login' ? '/dashboard'
    : null
  if (!target) return response

  const redirect = NextResponse.redirect(new URL(target, request.url))
  response.cookies.getAll().forEach((c) => redirect.cookies.set(c))
  return redirect
}
