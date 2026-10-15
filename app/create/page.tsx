import { redirect } from 'next/navigation'
import { AppHeader } from '@/components/app-header'
import { createClient } from '@/lib/supabase/server'
import { siteUrl } from '@/lib/env'
import { CreateForm } from './create-form'

export const metadata = { title: 'Write a Valentine' }

export default async function CreatePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', user.id).single()
  return (
    <div className="min-h-screen bg-cream text-[15px] leading-normal">
      <AppHeader name={profile?.display_name ?? 'You'} />
      <CreateForm siteUrl={siteUrl()} />
    </div>
  )
}
