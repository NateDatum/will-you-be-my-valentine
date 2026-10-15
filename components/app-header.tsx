import Link from 'next/link'
import { LogoMark } from './icons'
import { signOut } from '@/app/login/actions'

export function AppHeader({ name }: { name: string }) {
  return (
    <header className="border-b border-line bg-paper">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 px-6 py-4">
        <Link href="/dashboard" className="flex items-center gap-3 no-underline">
          <LogoMark />
          <span className="font-display text-xl font-semibold text-wine">Will You Be My Valentine?</span>
        </Link>
        <details className="relative">
          <summary aria-label={`Account menu for ${name}`} className="flex size-11 cursor-pointer list-none items-center justify-center rounded-full bg-peach font-semibold text-[#6A3A1F] [&::-webkit-details-marker]:hidden">
            {name.charAt(0).toUpperCase()}
          </summary>
          <form action={signOut} className="absolute right-0 z-10 mt-2 rounded-2xl border border-line bg-white p-2 shadow-[0_8px_28px_rgba(112,45,67,0.10)]">
            <button type="submit" className="btn-soft min-h-10 cursor-pointer whitespace-nowrap rounded-xl border border-line-2 bg-white px-4 font-medium text-wine">Sign out</button>
          </form>
        </details>
      </div>
    </header>
  )
}
