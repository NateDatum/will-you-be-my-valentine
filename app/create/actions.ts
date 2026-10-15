'use server'
import { nanoid } from 'nanoid'
import { createClient } from '@/lib/supabase/server'
import { expiresAtFor, inviteInput } from '@/lib/invite'

export type CreateState = { slug?: string; error?: string }

export async function createInvite(_: CreateState, fd: FormData): Promise<CreateState> {
  const parsed = inviteInput.safeParse(Object.fromEntries(fd))
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const { recipientName, message, datePlan, signedAs, theme } = parsed.data
  const slug = nanoid(21)
  const supabase = await createClient()
  const { error } = await supabase.from('invites').insert({
    share_slug: slug, recipient_name: recipientName, message, date_plan: datePlan, signed_as: signedAs, theme,
    expires_at: expiresAtFor(new Date()).toISOString(),
  })
  if (error) return { error: 'Couldn’t seal your letter. Please try again.' }
  return { slug }
}
