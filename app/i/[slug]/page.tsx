import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isExpired, SLUG_RE, type PublicInvite } from '@/lib/invite'
import { RecipientFlow } from './recipient-flow'

export const metadata: Metadata = {
  title: 'Someone has a question for you 💌',
  description: 'Open your letter.',
  robots: { index: false, follow: false },
}

export default async function InvitePage({ params, searchParams }: {
  params: Promise<{ slug: string }>; searchParams: Promise<{ preview?: string }>
}) {
  const { slug } = await params
  const { preview } = await searchParams
  if (!SLUG_RE.test(slug)) notFound()
  const supabase = await createClient()
  const { data } = await supabase.rpc('get_public_invite', { p_slug: slug })
  const invite = (data as PublicInvite[] | null)?.[0]
  if (!invite) notFound()
  const now = new Date()
  return (
    <RecipientFlow invite={invite} slug={slug} preview={preview === '1'}
      expired={isExpired(invite, now)} canChange={new Date(invite.expires_at) > now} />
  )
}
