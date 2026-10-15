'use client'
import Link from 'next/link'
import { useActionState, useState, useSyncExternalStore } from 'react'
import { THEMES, THEME_LIST, type ThemeId } from '@/lib/invite'
import { ArrowLeftIcon, CalendarIcon, CheckIcon, CopyIcon, EyeIcon, FlowerDecor, HeartIcon, SendIcon } from '@/components/icons'
import { createInvite, type CreateState } from './actions'

const card = 'rounded-3xl border border-line bg-white shadow-[0_8px_28px_rgba(112,45,67,0.06)]'
const field = 'min-h-12 rounded-[14px] border-[1.5px] bg-field px-3.5 text-base text-ink'
const noop = () => () => {}
const softLink = 'btn-soft flex flex-[1_1_200px] min-h-12 items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-line-2 bg-white font-semibold text-wine no-underline'

export function CreateForm({ siteUrl }: { siteUrl: string }) {
  const [state, action, pending] = useActionState<CreateState, FormData>(createInvite, {})
  const [recipient, setRecipient] = useState('')
  const [message, setMessage] = useState('')
  const [plan, setPlan] = useState('')
  const [sender, setSender] = useState('')
  const [theme, setTheme] = useState<ThemeId>('blush')
  const [nameError, setNameError] = useState(false)
  const [copied, setCopied] = useState(false)
  const [dismissed, setDismissed] = useState<string | undefined>()
  const done = state.slug && state.slug !== dismissed ? state.slug : null
  const canShare = useSyncExternalStore(noop, () => !!navigator.share, () => false)

  const th = THEMES[theme]
  const name = recipient.trim()
  const recipientDisplay = name || 'your Valentine'
  const messageDisplay = message.trim() || 'Your message will appear here.'
  const signoff = sender.trim() ? `With love, ${sender.trim()}` : 'With love, your secret admirer'
  const link = done ? `${siteUrl}/i/${done}` : ''
  const error = nameError ? 'Add their name so the card can greet them.' : state.field === 'recipientName' ? state.error : undefined
  const formError = state.field !== 'recipientName' ? state.error : undefined

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => { if (!name) { e.preventDefault(); setNameError(true) } }
  const copy = async () => {
    try { await navigator.clipboard.writeText(link) } catch {}
    setCopied(true); setTimeout(() => setCopied(false), 1800)
  }
  const share = () => navigator.share({ title: 'A letter for you 💌', url: link }).catch(() => {})
  const reset = () => { setDismissed(state.slug); setRecipient(''); setMessage(''); setPlan(''); setNameError(false); setCopied(false) }

  return (
    <main className="mx-auto flex max-w-[1240px] flex-col gap-6 px-6 pb-[72px] pt-8">
      <Link href="/dashboard" className="inline-flex min-h-10 items-center gap-1.5 self-start font-medium text-wine no-underline">
        <ArrowLeftIcon /> Back to invitations
      </Link>

      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 font-display text-[40px] font-semibold leading-[1.15] text-wine">Write a Valentine</h1>
        <p className="m-0 text-muted">A name and a few honest words are all it takes. Everything else is optional.</p>
      </div>

      <div className="flex flex-wrap items-start gap-8">
        <section aria-label="Invitation details" className="flex min-w-0 flex-[999_1_520px] flex-col gap-5">
          {!done && (
            <form action={action} onSubmit={onSubmit} className={`${card} flex flex-col gap-[22px] p-7`}>
              <div className="flex flex-col gap-2">
                <label htmlFor="f-recipient" className="font-semibold">Who is it for?</label>
                <input id="f-recipient" name="recipientName" type="text" value={recipient} maxLength={40}
                  onChange={(e) => { setRecipient(e.target.value); setNameError(false) }}
                  placeholder="Their first name" aria-invalid={!!error} aria-describedby={error ? 'f-recipient-err' : undefined}
                  className={`${field} ${error ? 'border-error' : 'border-line-2'}`} />
                {error && <span id="f-recipient-err" className="text-[13px] text-error">{error}</span>}
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between">
                  <label htmlFor="f-message" className="font-semibold">Your message</label>
                  <span className="text-[13px] text-muted-2">{message.length} / 280</span>
                </div>
                <textarea id="f-message" name="message" rows={4} maxLength={280} value={message} onChange={(e) => setMessage(e.target.value)}
                  placeholder="Say it the way only you would."
                  className="resize-y rounded-[14px] border-[1.5px] border-line-2 bg-field px-3.5 py-3 text-base leading-[1.55] text-ink" />
              </div>

              <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
                <div className="flex flex-col gap-2">
                  <label htmlFor="f-plan" className="font-semibold">Date plan <span className="font-normal text-muted-2">(optional)</span></label>
                  <input id="f-plan" name="datePlan" type="text" maxLength={120} value={plan} onChange={(e) => setPlan(e.target.value)}
                    placeholder="e.g. Dinner, Feb 14, 7 PM" className={`${field} border-line-2`} />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="f-sender" className="font-semibold">Sign it as <span className="font-normal text-muted-2">(optional)</span></label>
                  <input id="f-sender" name="signedAs" type="text" maxLength={40} value={sender} onChange={(e) => setSender(e.target.value)}
                    placeholder="Leave blank to stay a mystery" className={`${field} border-line-2`} />
                </div>
              </div>

              <fieldset className="m-0 flex flex-col gap-2.5 border-none p-0">
                <legend className="mb-2.5 p-0 font-semibold">Card theme</legend>
                <input type="hidden" name="theme" value={theme} />
                <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
                  {THEME_LIST.map((t) => {
                    const on = t.id === theme
                    return (
                      <button key={t.id} type="button" aria-pressed={on} onClick={() => setTheme(t.id)}
                        className="theme-opt flex cursor-pointer flex-col gap-2.5 rounded-[18px] border-2 bg-white p-3 text-left"
                        style={{ borderColor: on ? '#E85D75' : '#F1E3E6', boxShadow: on ? '0 6px 18px rgba(232, 93, 117, 0.18)' : 'none' }}>
                        <span aria-hidden="true" className="relative block h-16 overflow-hidden rounded-xl" style={{ background: t.bg }}>
                          <span className="absolute left-3.5 top-3.5 h-1.5 w-[46px] rounded-[3px] opacity-75" style={{ background: t.ink }} />
                          <span className="absolute left-3.5 top-[26px] h-1 w-[70px] rounded-sm opacity-30" style={{ background: t.ink }} />
                          <span className="absolute left-3.5 top-9 h-1 w-14 rounded-sm opacity-30" style={{ background: t.ink }} />
                          <span className="absolute -bottom-2.5 -right-2.5 size-11 rounded-full" style={{ background: t.decor }} />
                          <span className="absolute right-3 top-3 size-3.5 rounded-full" style={{ background: t.accent }} />
                        </span>
                        <span className="flex flex-col">
                          <span className="text-sm font-semibold text-ink">{t.name}</span>
                          <span className="text-xs text-muted-2">{t.desc}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </fieldset>

              {formError && <p role="alert" className="m-0 text-[13px] text-error">{formError}</p>}
              <button type="submit" disabled={pending}
                className="btn-primary inline-flex min-h-14 cursor-pointer items-center justify-center gap-2.5 rounded-2xl border-none bg-rose-deep text-[17px] font-semibold text-white shadow-[0_8px_20px_rgba(201,68,98,0.25)]">
                <SendIcon size={20} />{pending ? 'Sealing…' : 'Create Invitation'}
              </button>
            </form>
          )}

          {done && (
            <div role="status" className={`${card} rise flex flex-col gap-5 px-7 py-8`}>
              <div className="flex items-center gap-3.5">
                <span className="inline-flex size-[52px] items-center justify-center rounded-2xl bg-[#E4F0E8] text-[#2E5A43]"><CheckIcon size={26} /></span>
                <div className="flex flex-col">
                  <h2 className="m-0 font-display text-[26px] font-semibold text-wine">Your letter for {recipientDisplay} is sealed</h2>
                  <span className="text-muted">Send the link in any chat — it opens best on a phone.</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="new-link" className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-2">Shareable link</label>
                <div className="flex flex-wrap gap-2">
                  <input id="new-link" readOnly value={link} className={`${field} min-w-0 flex-[1_1_260px] border-line-2 text-[15px]`} />
                  <button type="button" onClick={copy} className="btn-primary inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-[14px] border-none bg-rose-deep px-5 font-semibold text-white">
                    <CopyIcon size={16} />{copied ? 'Copied!' : 'Copy link'}
                  </button>
                  {canShare && (
                    <button type="button" onClick={share} className="btn-primary inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-[14px] border-none bg-rose-deep px-5 font-semibold text-white">
                      <SendIcon size={16} />Share
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href={`/i/${done}?preview=1`} className={softLink}><EyeIcon size={17} />Preview as {recipientDisplay}</Link>
                <Link href="/dashboard" className={softLink}>Back to dashboard</Link>
              </div>
              <button type="button" onClick={reset} className="min-h-10 cursor-pointer self-start border-none bg-transparent px-1 font-medium text-wine underline">
                Write another invitation
              </button>
            </div>
          )}
        </section>

        <aside aria-label="Live preview" className="flex min-w-0 flex-[1_1_400px] flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-2">Live preview</span>
            <span className="text-[13px] text-muted-2">What {recipientDisplay} will see</span>
          </div>
          <div className="rounded-[36px] bg-[#EFE3E6] p-3.5">
            <div className="relative flex min-h-[520px] flex-col gap-4 overflow-hidden rounded-[26px] px-[22px] py-7 transition-[background] duration-300" style={{ background: th.bg }}>
              <FlowerDecor petal={th.decor} center={th.decor} dot={th.accent} className="absolute -right-[18px] -top-[18px]" />
              <span className="absolute bottom-[26px] left-[22px] opacity-50"><HeartIcon size={28} fill={th.decor} /></span>
              <div className="relative mt-9 flex flex-col gap-3.5 rounded-[22px] bg-white px-[22px] py-6 shadow-[0_10px_30px_rgba(112,45,67,0.10)]">
                <span className="font-display text-[19px] italic" style={{ color: th.ink }}>Dear {recipientDisplay},</span>
                <span className="font-display text-[30px] font-semibold leading-[1.15]" style={{ color: th.ink }}>Will you be my Valentine?</span>
                <p className="m-0 whitespace-pre-line text-[15px] leading-[1.6] text-ink-2">{messageDisplay}</p>
                {plan.trim() && (
                  <span className="inline-flex items-center gap-2 self-start rounded-xl px-3 py-2 text-sm font-medium" style={{ background: th.chip, color: th.ink }}>
                    <CalendarIcon size={16} />{plan}
                  </span>
                )}
                <span className="font-display text-[17px] italic" style={{ color: th.ink }}>{signoff}</span>
                <div aria-hidden="true" className="mt-1 flex flex-col gap-2.5">
                  <span className="flex min-h-12 items-center justify-center rounded-[14px] bg-rose-deep font-semibold text-white">Yes, I’d love to! 💗</span>
                  <span className="box-border flex min-h-12 items-center justify-center rounded-[14px] border-[1.5px] font-semibold" style={{ borderColor: th.ink, color: th.ink }}>No, thank you</span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}
