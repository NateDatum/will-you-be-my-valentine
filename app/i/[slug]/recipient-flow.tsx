'use client'
import { useEffect, useReducer, useRef, useState } from 'react'
import { THEMES, type PublicInvite } from '@/lib/invite'
import { initialFlow, step, type FlowEvent, type FlowState } from '@/lib/recipient-flow'
import { Bouquet, CalendarIcon, CheckIcon, ClockIcon, FlowerDecor, HeartIcon } from '@/components/icons'

const COLORS = ['#E85D75', '#F4A3B4', '#C9B3E6', '#FFC4A6', '#F9CED8']
// Same values as design/Recipient.dc.html lines 219-238
const HEARTS = [[6, 16, 13, -2], [18, 11, 16, -9], [30, 20, 14, -5], [44, 12, 18, -12], [57, 15, 15, -1], [68, 22, 17, -7], [80, 12, 14, -11], [90, 17, 19, -4], [50, 10, 21, -15]]
  .map(([left, size, dur, delay], i) => ({ color: COLORS[i % 5], style: { left: `${left}%`, width: size, height: size, animationDuration: `${dur}s`, animationDelay: `${delay}s` } }))
const PIECES = Array.from({ length: 24 }, (_, i) => {
  const a = (i / 24) * Math.PI * 2 + (i % 3) * 0.12, d = 120 + (i % 5) * 22, size = 12 + (i % 4) * 4
  return { color: COLORS[i % 5], style: { width: size, height: size, '--dx': `${Math.round(Math.cos(a) * d)}px`, '--dy': `${Math.round(Math.sin(a) * d * 0.9 + 60)}px`, '--r': `${(i % 2 ? 1 : -1) * (20 + i * 7)}deg`, animationDelay: `${((i % 6) * 0.04).toFixed(2)}s` } as React.CSSProperties }
})
const HEART_PATH = 'M12 20.5C7 16.8 3 13.6 3 9.4 3 6.6 5.1 4.5 7.8 4.5c1.7 0 3.2.9 4.2 2.3 1-1.4 2.5-2.3 4.2-2.3 2.7 0 4.8 2.1 4.8 4.9 0 4.2-4 7.4-9 11.1z'

const btn = 'w-full min-h-14 cursor-pointer rounded-2xl text-[17px] font-semibold'
const yesBtn = `btn-yes ${btn} border-none bg-rose-deep text-white shadow-[0_8px_20px_rgba(201,68,98,0.25)]`
const noBtn = `btn-no ${btn} border-[1.5px] border-wine bg-white text-wine`
const screen = 'relative z-[1] flex min-h-[100dvh] flex-col box-border'
const sheet = 'rounded-[28px] bg-white shadow-[0_16px_44px_rgba(112,45,67,0.14)]'

type Props = { invite: PublicInvite; slug: string; preview: boolean; expired: boolean; canChange: boolean }

export function RecipientFlow({ invite, slug, preview, expired, canChange }: Props) {
  const [state, setState] = useState<FlowState>(() => initialFlow(invite.status, expired))
  const [failed, setFailed] = useState<null | 'accepted' | 'declined'>(null)
  const [burstKey, replay] = useReducer((n: number) => n + 1, 0) // re-key restarts the CSS burst
  const opened = useRef(false)
  const th = THEMES[invite.theme]
  const { recipient_name: name, signed_as: from, date_plan: plan } = invite

  useEffect(() => {
    if (preview || opened.current || expired) return
    opened.current = true
    fetch(`/api/invites/${slug}/open`, { method: 'POST' }).catch(() => {})
  }, [preview, slug, expired])

  async function send(answer: 'accepted' | 'declined') {
    if (preview) return
    setFailed(null)
    try {
      const res = await fetch(`/api/invites/${slug}/respond`, {
        // keepalive: the answer still arrives if they close the tab right after tapping
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answer }), keepalive: true,
      })
      if (!res.ok) throw new Error(String(res.status))
    } catch { setFailed(answer) }
  }

  function dispatch(type: FlowEvent['type']) {
    const r = step(state, { type })
    setState(r.state)
    if (type === 'changeAnswer') setFailed(null) // never re-send an answer they've moved away from
    if (r.post) send(r.post)
    if (type === 'open') setTimeout(() => setState((s) => step(s, { type: 'opened' }).state), 1250)
  }
  const retry = () => { if (failed) send(failed) }

  const s = state.screen
  const changeLink = canChange && !preview && (
    <button type="button" onClick={() => dispatch('changeAnswer')} className="min-h-11 cursor-pointer self-center border-none bg-transparent text-[15px] font-medium text-wine underline">
      Change my answer
    </button>
  )

  return (
    <div className="min-h-[100dvh] text-base leading-[1.55] text-ink" style={{ background: th.bg }}>
      <div className="relative mx-auto min-h-[100dvh] w-full max-w-[390px] overflow-hidden">
        <FlowerDecor size={180} petal={th.decor} center="#FFD8C2" className="absolute -right-[60px] -top-[50px] opacity-60" />
        <FlowerDecor size={140} petal="#E9DDF8" center={th.bg} className="absolute -left-[54px] bottom-10 opacity-55" />

        {s !== 'expired' && s !== 'done' && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            {HEARTS.map((h, i) => (
              <svg key={i} className="fh" viewBox="0 0 24 24" style={h.style}><path d={HEART_PATH} fill={h.color} /></svg>
            ))}
          </div>
        )}

        {preview && (
          <span className="absolute left-1/2 top-3 z-20 -translate-x-1/2 whitespace-nowrap rounded-full bg-lavender px-3 py-1 text-[13px] font-medium text-[#47335F]">
            Preview — your answer won’t be sent
          </span>
        )}

        {(s === 'envelope' || s === 'opening') && (
          <main className={`${screen} items-center justify-between gap-8 px-7 pb-10 pt-14 text-center`}>
            <div className="flex flex-col items-center gap-2.5">
              <span className="text-[13px] font-semibold uppercase tracking-[0.12em] text-wine-soft">A letter for you</span>
              <h1 className="m-0 font-display text-[34px] font-semibold leading-[1.15]" style={{ color: th.ink }}>{name}, you’ve<br />got mail</h1>
              <p className="m-0 text-[15px] text-muted">Someone sealed this one with a heart.</p>
            </div>
            <div className={`env ${s === 'opening' ? 'opening' : 'env-idle'}`}>
              <div className="env-back" />
              <div className="env-letter" aria-hidden="true">
                <span className="text-left font-display text-[15px] italic" style={{ color: th.ink }}>Dear {name},</span>
                <span className="h-[5px] w-[85%] rounded-[3px] bg-[#F4E3E7]" />
                <span className="h-[5px] w-[70%] rounded-[3px] bg-[#F4E3E7]" />
                <span className="h-[5px] w-[78%] rounded-[3px] bg-[#F4E3E7]" />
              </div>
              <div className="env-pocket" />
              <div className="env-flap" />
              <div className="env-seal" aria-hidden="true"><HeartIcon size={22} fill="#FFFFFF" /></div>
            </div>
            <div className="flex w-full flex-col gap-3">
              <button type="button" onClick={() => dispatch('open')} disabled={s === 'opening'} className={yesBtn}>
                {s === 'opening' ? 'Opening…' : 'Open your letter'}
              </button>
              {from && <span className="text-sm text-muted-2">From <span className="font-display italic" style={{ color: th.ink }}>{from}</span></span>}
            </div>
          </main>
        )}

        {(s === 'card' || s === 'letterAgain') && (
          <main className={`${screen} card-in justify-center px-5 pb-7 pt-10`}>
            <article className={`${sheet} relative flex flex-col gap-4 overflow-hidden px-6 pb-6 pt-[30px]`}>
              <FlowerDecor size={96} petal={th.decor} dot={th.accent} className="absolute -right-6 -top-6" />
              <span className="font-display text-[21px] italic" style={{ color: th.ink }}>Dear {name},</span>
              <h1 className="m-0 font-display text-[34px] font-semibold leading-[1.12]" style={{ color: th.ink }}>Will you be my Valentine?</h1>
              {invite.message && <p className="m-0 whitespace-pre-line leading-[1.65] text-ink-2">{invite.message}</p>}
              {plan && (
                <span className="inline-flex items-center gap-2 self-start rounded-xl px-[13px] py-[9px] text-sm font-medium" style={{ background: th.chip, color: th.ink }}>
                  <CalendarIcon size={16} />{plan}
                </span>
              )}
              <span className="font-display text-lg italic" style={{ color: th.ink }}>With love, {from ?? 'your secret admirer'}</span>
              {s === 'card' ? (
                <div className="mt-1.5 flex flex-col gap-3">
                  <button type="button" onClick={() => dispatch('yes')} className={yesBtn}>Yes, I’d love to! 💗</button>
                  <button type="button" onClick={() => dispatch('no')} className={noBtn}>No, thank you</button>
                </div>
              ) : (
                <div className="mt-1.5 flex flex-col gap-3">
                  <span className="inline-flex items-center gap-2 self-center rounded-full bg-[#E4F0E8] px-3.5 py-2 text-sm font-semibold text-[#2E5A43]">
                    <HeartIcon size={15} fill="#5B8C72" />You said yes
                  </span>
                  <button type="button" onClick={() => dispatch('backToSurprise')} className={noBtn}>Back to the surprise</button>
                </div>
              )}
            </article>
          </main>
        )}

        {s === 'accepted' && (
          <main className={`${screen} items-center gap-[18px] px-6 pb-8 pt-12 text-center`}>
            {state.burst && (
              <div key={burstKey} aria-hidden="true" className="pointer-events-none absolute inset-0 z-[3]">
                {PIECES.map((p, i) => (
                  <svg key={i} className="burst-p" viewBox="0 0 24 24" style={p.style}><path d={HEART_PATH} fill={p.color} /></svg>
                ))}
              </div>
            )}
            <div className="pop-in flex flex-col items-center gap-2">
              <Bouquet variant="yes" width={128} height={144} />
              <h1 className="m-0 font-display text-[36px] font-bold leading-[1.12]" style={{ color: th.ink }}>Yay! It’s a date! 💕</h1>
              <p className="m-0 text-muted">
                {from ?? 'Your Valentine'} is going to be over the moon.{plan ? ' Here’s what’s planned:' : ''}
              </p>
            </div>
            {plan && (
              <section aria-label="Your date plan" className="relative z-[2] box-border flex w-full items-center gap-3.5 rounded-[22px] bg-white p-5 text-left shadow-[0_12px_32px_rgba(112,45,67,0.10)]">
                <span className="flex size-[58px] flex-none items-center justify-center rounded-[14px] bg-peach text-[#6A3226]"><CalendarIcon size={26} /></span>
                <span className="font-display text-xl font-semibold" style={{ color: th.ink }}>{plan}</span>
              </section>
            )}
            {!preview && !failed && (
              <div className="inline-flex items-center gap-2 text-sm font-medium text-[#2E5A43]">
                <CheckIcon size={16} />Your answer was sent to {from ?? 'them'}
              </div>
            )}
            <div className="mt-auto flex w-full flex-col gap-2.5">
              <button type="button" onClick={replay} className={`${yesBtn} min-h-[52px] text-base`}>Replay the surprise</button>
              <button type="button" onClick={() => dispatch('readAgain')} className={`${noBtn} min-h-[52px] text-base`}>Read the letter again</button>
              {changeLink}
            </div>
          </main>
        )}

        {s === 'decline1' && (
          <main className={`${screen} card-in justify-center px-5 pb-7 pt-10`}>
            <section className={`${sheet} flex flex-col items-center gap-3.5 px-6 pb-6 pt-8 text-center`}>
              <svg width="96" height="88" viewBox="0 0 96 88" aria-hidden="true">
                <path d="M48 82C26 66 6 52 6 32 6 18 16 8 29 8c8 0 15 4 19 11 4-7 11-11 19-11 13 0 23 10 23 24 0 20-20 34-42 50z" fill="#F9CED8" />
                <circle cx="35" cy="38" r="4" fill="#702D43" /><circle cx="61" cy="38" r="4" fill="#702D43" />
                <path d="M38 52c4 3 16 3 20 0" stroke="#702D43" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              </svg>
              <h1 className="m-0 font-display text-[30px] font-semibold leading-[1.18]" style={{ color: th.ink }}>Okay! Just double-checking 💌</h1>
              <p className="m-0 text-muted">No pressure at all — just making sure your thumb didn’t slip.</p>
              <div className="mt-2 flex w-full flex-col gap-3">
                <button type="button" onClick={() => dispatch('reconsider')} className={noBtn}>Let me reconsider</button>
                <button type="button" onClick={() => dispatch('keepNo')} className={noBtn}>Yes, I’m sure</button>
              </div>
            </section>
          </main>
        )}

        {s === 'decline2' && (
          <main className={`${screen} card-in items-center gap-4 px-6 pb-8 pt-14 text-center`}>
            <Bouquet variant="no" width={172} height={194} />
            <h1 className="m-0 font-display text-[31px] font-semibold leading-[1.18]" style={{ color: th.ink }}>Two Nos?<br />Message received! 💌</h1>
            <p className="m-0 max-w-[320px] text-ink-2">Your answer is respected. Here’s a little virtual bouquet to brighten your day anyway. 🌷</p>
            <button type="button" onClick={() => dispatch('takeCare')} className={`${yesBtn} mt-auto`}>Take care! 💐</button>
          </main>
        )}

        {s === 'done' && (
          <main className={`${screen} card-in items-center justify-center gap-3.5 px-8 py-10 text-center`}>
            <span className="inline-flex size-[72px] items-center justify-center rounded-full bg-white shadow-[0_8px_24px_rgba(112,45,67,0.10)]"><HeartIcon size={34} /></span>
            <h1 className="m-0 font-display text-[28px] font-semibold" style={{ color: th.ink }}>Take care, {name}</h1>
            <p className="m-0 text-muted">
              {preview ? 'Preview only — nothing was sent.' : `Your reply has been sent${from ? ` to ${from}` : ''}.`} Thanks for being honest — and kind about it.
            </p>
            {changeLink}
          </main>
        )}

        {s === 'expired' && (
          <main className={`${screen} items-center justify-center gap-7 px-7 pb-10 pt-14 text-center`}>
            <div className="env env-muted" aria-hidden="true">
              <div className="env-back" />
              <div className="env-pocket" />
              <div className="env-flap" />
              <div className="env-seal text-white"><ClockIcon size={22} /></div>
            </div>
            <div className="flex flex-col items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EFEBED] px-3 py-1 text-[13px] font-semibold text-[#5E5358]">Invitation expired</span>
              <h1 className="m-0 font-display text-[30px] font-semibold leading-[1.2]" style={{ color: th.ink }}>This letter has<br />passed its date</h1>
              <p className="m-0 max-w-[300px] text-muted">
                The link {from ?? 'they'} sent is no longer active. If you’d still like to reply, the sweetest way is to tell them directly.
              </p>
            </div>
          </main>
        )}

        <div role="alert" className="fixed bottom-4 left-1/2 z-30 -translate-x-1/2">
          {failed && (
            <button type="button" onClick={retry}
              className="min-h-12 cursor-pointer whitespace-nowrap rounded-full border-none bg-wine px-5 font-semibold text-white shadow-[0_8px_20px_rgba(112,45,67,0.3)]">
              Couldn’t send — tap to try again
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
