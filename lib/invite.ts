import { z } from 'zod'

export type ThemeId = 'blush' | 'lavender' | 'peach'
export type Theme = { id: ThemeId; name: string; desc: string; bg: string; accent: string; decor: string; ink: string; chip: string; av: string; avFg: string }

export const THEMES: Record<ThemeId, Theme> = {
  blush: { id: 'blush', name: 'Blush letter', desc: 'Soft pink, classic', bg: '#FFF0F3', accent: '#E85D75', decor: '#F9CED8', ink: '#702D43', chip: '#FFE3E9', av: '#FFE1E7', avFg: '#702D43' },
  lavender: { id: 'lavender', name: 'Lavender dream', desc: 'Calm and dreamy', bg: '#F3ECFB', accent: '#9C7CC6', decor: '#E9DDF8', ink: '#4F2F5C', chip: '#EEE4F9', av: '#E9DDF8', avFg: '#47335F' },
  peach: { id: 'peach', name: 'Peach garden', desc: 'Warm and sunny', bg: '#FFF4EC', accent: '#E8865D', decor: '#FFD8C2', ink: '#6A3226', chip: '#FFE6D6', av: '#FFD8C2', avFg: '#6A3A1F' },
}
export const THEME_LIST = Object.values(THEMES)

export type InviteStatus = 'sent' | 'opened' | 'accepted' | 'declined'
export type DisplayStatus = 'pending' | 'accepted' | 'declined' | 'expired'

export type InviteRow = {
  id: string; share_slug: string; recipient_name: string; message: string
  date_plan: string | null; signed_as: string | null; theme: ThemeId; status: InviteStatus
  opened_at: string | null; responded_at: string | null; expires_at: string; created_at: string
}
export type PublicInvite = Pick<InviteRow, 'recipient_name' | 'message' | 'date_plan' | 'signed_as' | 'theme' | 'status' | 'expires_at'>

// Browsers submit textarea line breaks as CRLF; count each break as one character, like the on-screen counter.
const text = (max: number, msg?: string) =>
  z.string().transform((s) => s.replace(/\r\n?/g, '\n')).pipe(z.string().trim().max(max, msg))
const optional = (max: number) => text(max).optional().transform((v) => v || null)

export const inviteInput = z.object({
  recipientName: z.string().trim().min(1, 'Add their name so the card can greet them.').max(40),
  message: text(280, 'Keep your message to 280 characters.').default(''),
  datePlan: optional(120),
  signedAs: optional(40),
  theme: z.enum(['blush', 'lavender', 'peach']),
})

export const answerInput = z.object({ answer: z.enum(['accepted', 'declined']) })

export const SLUG_RE = /^[A-Za-z0-9_-]{21}$/

// Manila is UTC+8 with no DST: Feb 14 23:59:59 local = 15:59:59Z.
export function expiresAtFor(now: Date): Date {
  const y = now.getUTCFullYear()
  const year = now.getTime() > Date.UTC(y, 1, 14, 15, 59, 59) ? y + 1 : y
  return new Date(Date.UTC(year, 1, 15, 15, 59, 59))
}

export function isExpired(row: Pick<InviteRow, 'status' | 'expires_at'>, now = new Date()) {
  return (row.status === 'sent' || row.status === 'opened') && new Date(row.expires_at) < now
}

export function deriveStatus(row: Pick<InviteRow, 'status' | 'expires_at'>, now = new Date()): DisplayStatus {
  if (row.status === 'accepted' || row.status === 'declined') return row.status
  return isExpired(row, now) ? 'expired' : 'pending'
}

const TZ = 'Asia/Manila'
export const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: TZ })
export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: TZ }).replace(/ /g, ' ')

export function activityText(row: InviteRow, now = new Date()) {
  switch (deriveStatus(row, now)) {
    case 'accepted': return `Said yes · ${fmtDay(row.responded_at!)}`
    case 'declined': return `Declined · ${fmtDay(row.responded_at!)}`
    case 'expired': return `Link expired ${fmtDay(row.expires_at)}`
    default: return row.opened_at ? `Opened ${fmtDay(row.opened_at)} · no reply yet` : 'Not opened yet'
  }
}

export function responseSummary(row: InviteRow, now = new Date()) {
  switch (deriveStatus(row, now)) {
    case 'accepted': return { title: 'Said yes — it’s a date!', detail: fmtDateTime(row.responded_at!) }
    case 'declined': return { title: 'Declined, kindly', detail: fmtDateTime(row.responded_at!) }
    case 'expired': return { title: 'Invitation expired', detail: `No reply before ${fmtDay(row.expires_at)}` }
    default: return row.opened_at
      ? { title: 'Opened, no reply yet', detail: `First opened ${fmtDateTime(row.opened_at)}` }
      : { title: 'Not opened yet', detail: 'The link hasn’t been opened' }
  }
}

export const STATUS_STYLE: Record<DisplayStatus, { label: string; bg: string; fg: string; dot: string }> = {
  accepted: { label: 'Accepted', bg: '#E4F0E8', fg: '#2E5A43', dot: '#5B8C72' },
  pending: { label: 'Pending', bg: '#FFF1DB', fg: '#7E5310', dot: '#D9A044' },
  declined: { label: 'Declined', bg: '#F7E7EB', fg: '#7A3F52', dot: '#C98A9A' },
  expired: { label: 'Expired', bg: '#EFEBED', fg: '#5E5358', dot: '#A79CA1' },
}
