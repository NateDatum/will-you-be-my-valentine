import { redirect } from 'next/navigation'
import { AppHeader } from '@/components/app-header'
import { createClient } from '@/lib/supabase/server'
import { siteUrl } from '@/lib/env'
import type { InviteRow } from '@/lib/invite'
import { DashboardView } from './dashboard-view'

export const metadata = { title: 'Your Valentine invitations' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const [{ data: profile }, { data: invites, error }] = await Promise.all([
    supabase.from('profiles').select('display_name').eq('id', user.id).single(),
    supabase.from('invites').select('*').order('created_at', { ascending: false }),
  ])
  if (error) throw error
  const name = profile?.display_name ?? 'there'
  return (
    <div className="min-h-screen bg-cream text-[15px] leading-normal">
      <AppHeader name={name} />
      <DashboardView name={name} invites={(invites ?? []) as InviteRow[]} siteUrl={siteUrl()} />
    </div>
  )
}
