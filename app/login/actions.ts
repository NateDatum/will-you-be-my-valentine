'use server'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export type AuthState = { error?: string; field?: 'name' | 'email' | 'password' }

const creds = z.object({
  email: z.string().trim().pipe(z.email('Enter a valid email.')),
  password: z.string().min(8, 'Use at least 8 characters.'),
})
const signUpInput = creds.extend({ name: z.string().trim().min(1, 'Tell us your name.').max(40) })

const firstIssue = (e: z.ZodError): AuthState => ({ error: e.issues[0].message, field: e.issues[0].path[0] as AuthState['field'] })

export async function signIn(_: AuthState, fd: FormData): Promise<AuthState> {
  const parsed = creds.safeParse(Object.fromEntries(fd))
  if (!parsed.success) return firstIssue(parsed.error)
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) return { error: 'That email and password don’t match.', field: 'password' }
  redirect('/dashboard')
}

export async function signUp(_: AuthState, fd: FormData): Promise<AuthState> {
  const parsed = signUpInput.safeParse(Object.fromEntries(fd))
  if (!parsed.success) return firstIssue(parsed.error)
  const { name, email, password } = parsed.data
  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: name } } })
  if (error) return { error: error.message, field: 'email' }
  redirect('/dashboard')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
