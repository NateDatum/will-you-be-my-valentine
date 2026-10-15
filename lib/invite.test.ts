import { describe, expect, it } from 'vitest'
import { activityText, answerInput, deriveStatus, expiresAtFor, inviteInput, responseSummary, type InviteRow } from './invite'

const base: InviteRow = {
  id: '1', share_slug: 'a'.repeat(21), recipient_name: 'Mika', message: 'hi', date_plan: null, signed_as: 'Sam',
  theme: 'blush', status: 'sent', opened_at: null, responded_at: null,
  expires_at: '2027-02-15T15:59:59.000Z', created_at: '2027-02-08T13:15:00.000Z',
}
const before = new Date('2027-02-10T00:00:00Z')
const after = new Date('2027-02-16T00:00:00Z')

describe('expiresAtFor', () => {
  it('uses the coming February when created in October', () => {
    expect(expiresAtFor(new Date('2026-10-15T08:00:00Z')).toISOString()).toBe('2027-02-15T15:59:59.000Z')
  })
  it('uses this February when created before Valentine’s Day', () => {
    expect(expiresAtFor(new Date('2027-02-10T00:00:00Z')).toISOString()).toBe('2027-02-15T15:59:59.000Z')
  })
  it('still uses this February on Feb 14 in Manila', () => {
    expect(expiresAtFor(new Date('2027-02-14T04:00:00Z')).toISOString()).toBe('2027-02-15T15:59:59.000Z')
  })
  it('rolls to next year after Feb 14 Manila time', () => {
    expect(expiresAtFor(new Date('2027-02-20T00:00:00Z')).toISOString()).toBe('2028-02-15T15:59:59.000Z')
  })
})

describe('inviteInput', () => {
  it('rejects a whitespace-only recipient with the designed message', () => {
    const r = inviteInput.safeParse({ recipientName: '   ', message: '', theme: 'blush' })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].message).toBe('Add their name so the card can greet them.')
  })
  it('trims and turns blank optionals into null', () => {
    const r = inviteInput.parse({ recipientName: ' Mika ', message: ' hi ', datePlan: '  ', signedAs: '', theme: 'peach' })
    expect(r).toEqual({ recipientName: 'Mika', message: 'hi', datePlan: null, signedAs: null, theme: 'peach' })
  })
  it('accepts a 140-emoji message (280 UTF-16 units) and rejects 281 chars', () => {
    expect(inviteInput.safeParse({ recipientName: 'A', message: '💗'.repeat(140), theme: 'blush' }).success).toBe(true)
    expect(inviteInput.safeParse({ recipientName: 'A', message: 'x'.repeat(281), theme: 'blush' }).success).toBe(false)
  })
  it('counts textarea CRLF line breaks as one character', () => {
    const message = ['a'.repeat(92), 'b'.repeat(92), 'c'.repeat(92)].join('\r\n') + '\r\nd' // 280 chars once normalised
    const r = inviteInput.safeParse({ recipientName: 'A', message, theme: 'blush' })
    expect(r.success).toBe(true)
    expect(r.data?.message).not.toContain('\r')
  })
  it('rejects an unknown theme and a 41-char name', () => {
    expect(inviteInput.safeParse({ recipientName: 'A', message: '', theme: 'neon' }).success).toBe(false)
    expect(inviteInput.safeParse({ recipientName: 'x'.repeat(41), message: '', theme: 'blush' }).success).toBe(false)
  })
})

describe('answerInput', () => {
  it('only allows accepted or declined', () => {
    expect(answerInput.safeParse({ answer: 'accepted' }).success).toBe(true)
    expect(answerInput.safeParse({ answer: 'maybe' }).success).toBe(false)
  })
})

describe('deriveStatus', () => {
  it('sent or opened before expiry is pending', () => {
    expect(deriveStatus(base, before)).toBe('pending')
    expect(deriveStatus({ ...base, status: 'opened' }, before)).toBe('pending')
  })
  it('unanswered after expiry is expired', () => {
    expect(deriveStatus({ ...base, status: 'opened' }, after)).toBe('expired')
  })
  it('answered invites never expire', () => {
    expect(deriveStatus({ ...base, status: 'accepted' }, after)).toBe('accepted')
    expect(deriveStatus({ ...base, status: 'declined' }, after)).toBe('declined')
  })
})

describe('activityText / responseSummary', () => {
  it('describes each state', () => {
    expect(activityText(base, before)).toBe('Not opened yet')
    expect(activityText({ ...base, status: 'opened', opened_at: '2027-02-11T02:20:00Z' }, before)).toBe('Opened Feb 11 · no reply yet')
    expect(activityText({ ...base, status: 'accepted', responded_at: '2027-02-09T12:42:00Z' }, before)).toBe('Said yes · Feb 9')
    expect(activityText({ ...base, status: 'declined', responded_at: '2027-02-08T12:00:00Z' }, before)).toBe('Declined · Feb 8')
    expect(activityText(base, after)).toBe('Link expired Feb 15')
  })
  it('summarises only the final answer and its time', () => {
    expect(responseSummary({ ...base, status: 'accepted', responded_at: '2027-02-09T12:42:00Z' }, before))
      .toEqual({ title: 'Said yes — it’s a date!', detail: 'Feb 9, 8:42 PM' })
    expect(responseSummary({ ...base, status: 'declined', responded_at: '2027-02-08T12:00:00Z' }, before))
      .toEqual({ title: 'Declined, kindly', detail: 'Feb 8, 8:00 PM' })
    expect(responseSummary(base, after)).toEqual({ title: 'Invitation expired', detail: 'No reply before Feb 15' })
  })
})
