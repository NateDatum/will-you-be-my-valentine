'use client'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { activityText, deriveStatus, fmtDateTime, fmtDay, responseSummary, STATUS_STYLE, THEMES, type DisplayStatus, type InviteRow } from '@/lib/invite'
import { StatusPill } from '@/components/status-pill'
import { ClockIcon, CopyIcon, EnvelopeIcon, EyeIcon, HeartOutlineIcon, PlusIcon, XCircleIcon, XIcon } from '@/components/icons'

type Filter = 'all' | DisplayStatus
const TABS: [Filter, string][] = [['all', 'All'], ['pending', 'Pending'], ['accepted', 'Accepted'], ['declined', 'Declined'], ['expired', 'Expired']]
const card = 'rounded-3xl border border-line bg-white shadow-[0_8px_28px_rgba(112,45,67,0.06)]'
const cols = 'grid grid-cols-[minmax(210px,2.2fr)_minmax(110px,1fr)_minmax(200px,2fr)_minmax(80px,0.8fr)_200px] gap-4'
const softBtn = 'btn-soft inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-line-2 bg-white text-[13px] text-wine'
const label = 'text-xs font-semibold uppercase tracking-[0.06em] text-muted-2'

function NewInviteLink({ children }: { children: React.ReactNode }) {
  return (
    <Link href="/create" className="btn-primary inline-flex min-h-12 items-center gap-2 rounded-[14px] bg-rose-deep px-[22px] font-semibold text-white no-underline shadow-[0_6px_16px_rgba(201,68,98,0.22)]">
      {children}
    </Link>
  )
}

export function DashboardView({ name, invites, siteUrl }: { name: string; invites: InviteRow[]; siteUrl: string }) {
  const [filter, setFilter] = useState<Filter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(invites[0]?.id ?? null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const rows = useMemo(() => invites.map((inv) => ({ inv, status: deriveStatus(inv) })), [invites])
  const count = (s: DisplayStatus) => rows.filter((r) => r.status === s).length
  const counts = { total: rows.length, pending: count('pending'), accepted: count('accepted'), declined: count('declined'), expired: count('expired') }
  const visible = rows.filter((r) => filter === 'all' || r.status === filter)
  const selected = rows.find((r) => r.inv.id === selectedId)
  const linkFor = (inv: InviteRow) => `${siteUrl}/i/${inv.share_slug}`

  async function copy(inv: InviteRow) {
    try { await navigator.clipboard.writeText(linkFor(inv)) } catch {}
    setCopiedId(inv.id); setTimeout(() => setCopiedId(null), 1800)
  }

  const stats: { label: string; value: number; note: string; icon: React.ReactNode; bg: string; fg: string }[] = [
    { label: 'Total sent', value: counts.total, note: `${counts.expired} expired without a reply`, icon: <EnvelopeIcon />, bg: '#E9DDF8', fg: '#47335F' },
    { label: 'Pending', value: counts.pending, note: 'Waiting on a reply', icon: <ClockIcon />, bg: STATUS_STYLE.pending.bg, fg: STATUS_STYLE.pending.fg },
    { label: 'Accepted', value: counts.accepted, note: 'It’s a date', icon: <HeartOutlineIcon />, bg: STATUS_STYLE.accepted.bg, fg: STATUS_STYLE.accepted.fg },
    { label: 'Declined', value: counts.declined, note: 'Answer respected', icon: <XCircleIcon />, bg: STATUS_STYLE.declined.bg, fg: STATUS_STYLE.declined.fg },
  ]

  return (
    <main className="mx-auto flex max-w-[1240px] flex-col gap-7 px-6 pb-[72px] pt-10">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium tracking-[0.02em] text-wine-soft">Hi {name}</span>
          <h1 className="m-0 font-display text-[40px] font-semibold leading-[1.15] text-wine">Your Valentine invitations</h1>
          <p className="m-0 max-w-[520px] text-muted">See who has opened your letters and how they replied.</p>
        </div>
        <NewInviteLink><PlusIcon />New invitation</NewInviteLink>
      </div>

      {invites.length === 0 ? (
        <section className={`${card} flex flex-col items-center gap-4 px-6 py-16 text-center`}>
          <svg width="160" height="120" viewBox="0 0 160 120" aria-hidden="true">
            <ellipse cx="80" cy="108" rx="58" ry="7" fill="#F6E7EA" />
            <rect x="26" y="30" width="108" height="72" rx="12" fill="#FFF0F3" stroke="#702D43" strokeWidth="2" />
            <path d="M28 34l52 38 52-38" fill="none" stroke="#702D43" strokeWidth="2" strokeLinejoin="round" />
            <circle cx="80" cy="70" r="13" fill="#E85D75" />
            <path d="M80 77.5c-4-3-6.8-5.4-6.8-8.3 0-2.1 1.6-3.7 3.6-3.7 1.4 0 2.5.8 3.2 1.8.7-1 1.8-1.8 3.2-1.8 2 0 3.6 1.6 3.6 3.7 0 2.9-2.8 5.3-6.8 8.3z" fill="#FFFFFF" />
            <path d="M124 18c-2.4-1.8-4-3.2-4-5 0-1.2 1-2.2 2.2-2.2.8 0 1.4.4 1.8 1 .4-.6 1-1 1.8-1 1.2 0 2.2 1 2.2 2.2 0 1.8-1.6 3.2-4 5z" fill="#E9A3B3" />
            <path d="M36 20c-1.8-1.3-3-2.4-3-3.7 0-.9.7-1.6 1.6-1.6.6 0 1.1.3 1.4.8.3-.5.8-.8 1.4-.8.9 0 1.6.7 1.6 1.6 0 1.3-1.2 2.4-3 3.7z" fill="#C9B3E6" />
          </svg>
          <h2 className="m-0 font-display text-[28px] font-semibold text-wine">No invitations yet</h2>
          <p className="m-0 max-w-[420px] text-muted">Your first letter is waiting to be written. Add a name, a few heartfelt words, and we’ll wrap it up in a card worth opening.</p>
          <div className="mt-2"><NewInviteLink>Write your first invitation</NewInviteLink></div>
        </section>
      ) : (
        <div className="flex flex-col gap-7">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
            {stats.map((st) => (
              <div key={st.label} className="flex flex-col gap-3 rounded-[20px] border border-line bg-white p-5 shadow-[0_4px_16px_rgba(112,45,67,0.05)]">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted">{st.label}</span>
                  <span className="inline-flex size-9 items-center justify-center rounded-xl" style={{ background: st.bg, color: st.fg }}>{st.icon}</span>
                </div>
                <span className="font-display text-[40px] font-semibold leading-none text-ink">{st.value}</span>
                <span className="text-[13px] text-muted-2">{st.note}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-start gap-6">
            <section aria-labelledby="inv-title" className={`${card} min-w-0 flex-[999_1_560px] overflow-hidden`}>
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#F4E8EB] px-6 py-5">
                <h2 id="inv-title" className="m-0 font-display text-[22px] font-semibold text-wine">Invitations</h2>
                <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-1.5">
                  {TABS.map(([id, text]) => {
                    const on = filter === id
                    return (
                      <button key={id} type="button" aria-pressed={on} onClick={() => setFilter(id)}
                        className="min-h-9 cursor-pointer rounded-full border px-3.5 text-[13px] font-medium"
                        style={{ background: on ? '#702D43' : '#FFFFFF', color: on ? '#FFFFFF' : '#5E5157', borderColor: on ? '#702D43' : '#EBD5DA' }}>
                        {text} · {id === 'all' ? counts.total : counts[id]}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="overflow-x-auto">
                <div className="min-w-[820px]">
                  <div className={`${cols} bg-field px-6 py-3 ${label}`}>
                    <span>Recipient</span><span>Status</span><span>Latest activity</span><span>Sent</span><span className="text-right">Actions</span>
                  </div>
                  {visible.map(({ inv, status }) => {
                    const t = THEMES[inv.theme]
                    return (
                      <div key={inv.id} className={`row ${cols} items-center border-t border-[#F4E8EB] px-6 py-3.5`} style={{ background: selectedId === inv.id ? '#FFF0F3' : '#FFFFFF' }}>
                        <div className="flex min-w-0 items-center gap-3">
                          <span aria-hidden="true" className="inline-flex size-10 flex-none items-center justify-center rounded-full font-semibold" style={{ background: t.av, color: t.avFg }}>{inv.recipient_name.charAt(0).toUpperCase()}</span>
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate font-semibold text-ink">{inv.recipient_name}</span>
                            <span className="text-[13px] text-muted-2">{t.name}</span>
                          </div>
                        </div>
                        <StatusPill status={status} />
                        <span className="text-sm text-muted">{activityText(inv)}</span>
                        <span className="text-sm text-muted">{fmtDay(inv.created_at)}</span>
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => copy(inv)} aria-label={`Copy invitation link for ${inv.recipient_name}`} className={`${softBtn} px-3 font-medium`}>
                            <CopyIcon size={15} />{copiedId === inv.id ? 'Copied!' : 'Copy link'}
                          </button>
                          <button type="button" onClick={() => setSelectedId(inv.id)} aria-label={`View details for ${inv.recipient_name}`} className={`${softBtn} px-3.5 font-semibold`}>
                            Details
                          </button>
                        </div>
                      </div>
                    )
                  })}
                  {visible.length === 0 && (
                    <div className="border-t border-[#F4E8EB] px-6 py-10 text-center text-muted-2">No invitations with this status yet.</div>
                  )}
                </div>
              </div>
            </section>

            <aside aria-label="Invitation details" className="flex min-w-0 flex-[1_1_340px] flex-col gap-4">
              {selected ? (() => {
                const { inv, status } = selected
                const t = THEMES[inv.theme]
                const s = STATUS_STYLE[status]
                const res = responseSummary(inv)
                return (
                  <div className={`${card} flex flex-col gap-5 p-6`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3.5">
                        <span aria-hidden="true" className="inline-flex size-[52px] items-center justify-center rounded-full font-display text-[22px] font-semibold" style={{ background: t.av, color: t.avFg }}>{inv.recipient_name.charAt(0).toUpperCase()}</span>
                        <div className="flex flex-col gap-1">
                          <h3 className="m-0 font-display text-2xl font-semibold text-wine">{inv.recipient_name}</h3>
                          <StatusPill status={status} small />
                        </div>
                      </div>
                      <button type="button" onClick={() => setSelectedId(null)} aria-label="Close details" className="btn-soft inline-flex size-10 cursor-pointer items-center justify-center rounded-xl border border-line-2 bg-white text-wine">
                        <XIcon size={16} />
                      </button>
                    </div>

                    <div className="flex flex-col gap-1 rounded-2xl p-4" style={{ background: s.bg }}>
                      <span className="text-xs font-semibold uppercase tracking-[0.06em]" style={{ color: s.fg }}>Their response</span>
                      <span className="font-semibold text-ink">{res.title}</span>
                      <span className="text-sm text-muted">{res.detail}</span>
                    </div>

                    <div className="flex flex-col gap-2">
                      <span className={label}>Your message</span>
                      <p className="m-0 font-display text-[17px] italic leading-[1.55] text-[#4A3540]">{inv.message ? `“${inv.message}”` : 'No message — just the question.'}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-0.5"><span className="text-xs text-muted-2">Date plan</span><span className="text-sm font-medium">{inv.date_plan ?? 'No plan added'}</span></div>
                      <div className="flex flex-col gap-0.5"><span className="text-xs text-muted-2">Sent</span><span className="text-sm font-medium">{fmtDateTime(inv.created_at)}</span></div>
                      <div className="flex flex-col gap-0.5"><span className="text-xs text-muted-2">Theme</span><span className="text-sm font-medium">{t.name}</span></div>
                      <div className="flex flex-col gap-0.5"><span className="text-xs text-muted-2">Link expires</span><span className="text-sm font-medium">{fmtDay(inv.expires_at)}</span></div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label htmlFor="sel-link" className={label}>Shareable link</label>
                      <div className="flex gap-2">
                        <input id="sel-link" readOnly value={linkFor(inv)} className="min-h-11 min-w-0 flex-1 rounded-xl border border-line-2 bg-field px-3 text-sm text-ink" />
                        <button type="button" onClick={() => copy(inv)} className="btn-primary inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border-none bg-rose-deep px-4 font-semibold text-white">
                          <CopyIcon size={15} />{copiedId === inv.id ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>

                    <Link href={`/i/${inv.share_slug}?preview=1`} className="btn-soft inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line-2 font-semibold text-wine no-underline">
                      <EyeIcon size={17} />Preview as recipient
                    </Link>
                  </div>
                )
              })() : (
                <div className="flex flex-col items-center gap-2.5 rounded-3xl border border-dashed border-line-2 bg-white px-6 py-8 text-center text-muted">
                  <span className="text-rose"><EnvelopeIcon size={40} /></span>
                  <span className="font-display text-lg text-wine">Pick an invitation</span>
                  <span className="text-sm">Choose Details on any row to see the message, plan and response.</span>
                </div>
              )}
            </aside>
          </div>
        </div>
      )}
    </main>
  )
}
