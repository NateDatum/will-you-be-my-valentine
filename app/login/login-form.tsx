'use client'
import { useActionState, useState } from 'react'
import { LogoMark } from '@/components/icons'
import { signIn, signUp, type AuthState } from './actions'

function AuthForm({ mode, onToggle }: { mode: 'in' | 'up'; onToggle: () => void }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === 'in' ? signIn : signUp, {})
  const err = (f: AuthState['field']) => (state.field === f ? state.error : undefined)
  const input = (name: 'name' | 'email' | 'password', label: string, type: string, autoComplete: string) => (
    <div className="flex flex-col gap-2">
      <label htmlFor={`f-${name}`} className="font-semibold">{label}</label>
      <input id={`f-${name}`} name={name} type={type} autoComplete={autoComplete} required
        aria-invalid={!!err(name)} aria-describedby={err(name) ? `f-${name}-err` : undefined}
        className={`min-h-12 rounded-[14px] border-[1.5px] bg-field px-3.5 text-base text-ink ${err(name) ? 'border-error' : 'border-line-2'}`} />
      {err(name) && <span id={`f-${name}-err`} className="text-[13px] text-error">{err(name)}</span>}
    </div>
  )
  return (
    <form action={action} className="flex w-full max-w-[420px] flex-col gap-5 rounded-3xl border border-line bg-white p-7 shadow-[0_8px_28px_rgba(112,45,67,0.06)]">
      <div className="flex items-center gap-3"><LogoMark /><span className="font-display text-xl font-semibold text-wine">Will You Be My Valentine?</span></div>
      <h1 className="m-0 font-display text-[32px] font-semibold leading-tight text-wine">
        {mode === 'in' ? 'Sign in to write a Valentine' : 'Create your account'}
      </h1>
      {mode === 'up' && input('name', 'Your name', 'text', 'given-name')}
      {input('email', 'Email', 'email', 'email')}
      {input('password', 'Password', 'password', mode === 'in' ? 'current-password' : 'new-password')}
      <button type="submit" disabled={pending} className="btn-primary min-h-14 cursor-pointer rounded-2xl border-none bg-rose-deep text-[17px] font-semibold text-white shadow-[0_8px_20px_rgba(201,68,98,0.25)]">
        {pending ? 'One moment…' : mode === 'in' ? 'Sign in' : 'Create account'}
      </button>
      <button type="button" onClick={onToggle} className="min-h-11 cursor-pointer self-center border-none bg-transparent font-medium text-wine underline">
        {mode === 'in' ? 'New here? Create an account' : 'Already have an account? Sign in'}
      </button>
    </form>
  )
}

export function LoginForm() {
  const [mode, setMode] = useState<'in' | 'up'>('in')
  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-4 py-12">
      {/* key resets the action state when switching modes */}
      <AuthForm key={mode} mode={mode} onToggle={() => setMode(mode === 'in' ? 'up' : 'in')} />
    </main>
  )
}
