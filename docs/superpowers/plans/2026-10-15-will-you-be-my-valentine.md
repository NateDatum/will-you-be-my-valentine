# Will You Be My Valentine? Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a deployed Next.js + Supabase app where signed-in senders create Valentine invitations and anonymous recipients answer them through a share link.

**Architecture:** Next.js App Router on Vercel. Senders authenticate with Supabase Auth (email + password); their reads/writes run under Postgres RLS as themselves. Recipients never log in: Route Handlers call three `security definer` Postgres functions keyed by an unguessable 21-char slug. No service-role key exists in the app.

**Tech Stack:** Next.js (latest via `create-next-app@latest`), TypeScript, Tailwind CSS v4, `@supabase/ssr`, `@supabase/supabase-js`, `zod`, `nanoid`, Vitest, Playwright, Supabase CLI via `npx`, Vercel CLI via `npx`.

**Spec:** `docs/superpowers/specs/2026-10-15-will-you-be-my-valentine-design.md`
**Visual source:** `design/*.dc.html` (copied from the Claude Design canvas).

**Porting convention (UI tasks 6–8):** each page's logic (state, handlers, derived values) is written out in full below. Its markup is ported from an exact line range of a `design/*.dc.html` file: convert `style="…"` to Tailwind utilities with the theme tokens, `{{value}}` to the named JS value, `<sc-if>` to `&&`, `<sc-for>` to `.map`, `onClick="{{x}}"` to `onClick={x}`. Every deviation from the design is listed in the task. The `return null` stubs in those snippets mark where the ported JSX goes.

## Global Constraints

- Both answer buttons always visible, equal size and position; after a second No the app stops asking.
- The No count is never sent to the server. Only the final `accepted` / `declined` is posted.
- Sender sees only the final answer + its time. No "first try" / "after one are-you-sure" text anywhere.
- Decline-once heading: `Okay! Just double-checking 💌`; its two buttons share the outline style.
- No "Prototype · sample data" badges or prototype banner.
- Limits: recipient 1–40, message ≤280, date plan ≤120, signed-as ≤40, display name 1–40 — enforced by zod **and** DB checks.
- `share_slug` = `nanoid(21)`.
- `expires_at` = Feb 15 23:59:59 Asia/Manila (UTC+8) after the next upcoming Feb 14.
- Recipient page metadata: title `Someone has a question for you 💌`, `robots: noindex`; never names or message in metadata.
- App env vars only: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`), `NEXT_PUBLIC_SITE_URL` (optional on Vercel).
- Tokens: Rose `#E85D75`, Rose deep `#C94462` (hover `#B33A56`), Blush `#FFF0F3`, Cream `#FFF9F2`, Wine `#702D43`, Lavender `#E9DDF8`, Peach `#FFD8C2`, Ink `#352B30`, Muted `#5E5157`/`#6B5F65`, Line `#F1E3E6`/`#EBD5DA`, Error `#A3324E`. Fonts: Playfair Display + Inter.
- Display dates in `Asia/Manila`, `en-US` format (`Feb 9`, `Feb 9, 8:42 PM`).
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Recipient taps Yes but the network fails** → screen stays on the celebration, a retry toast appears, the choice is not lost; re-sending the same answer is harmless. (Task 7 component `failed`/`retry`; Task 9 e2e repeat-answer 200.)
2. **Recipient reopens an answered link after it expired** → sees their answer, no "Change my answer" link. (Task 3 `initialFlow` test; Task 7 `canChange`.)
3. **Whitespace-only or emoji-heavy input** → `"   "` name rejected with the designed error; a 140-emoji message accepted (JS length ≥ Postgres char count, so zod is the stricter gate). (Task 2 schema tests.)
4. **Signed-out visitor hits `/dashboard` or `/create`; signed-in visitor hits `/login`** → redirected to `/login` / `/dashboard`. (Task 9 e2e.)
5. **Unknown or malformed slug** (`/i/hello`, 21 random chars) → "lost in the mail" page; API 404. (Task 9 e2e.)

---

## File Structure

```
app/
  layout.tsx                      fonts, base metadata
  globals.css                     Tailwind import, tokens, ported keyframes/classes
  page.tsx                        fallback redirect → /login
  login/page.tsx, login/login-form.tsx, login/actions.ts
  dashboard/page.tsx              loads profile + invites (RLS)
  dashboard/dashboard-view.tsx    client: stats, filters, table, details
  create/page.tsx, create/create-form.tsx, create/actions.ts
  i/[slug]/page.tsx               loads public invite via RPC
  i/[slug]/recipient-flow.tsx     client: envelope → answer screens
  i/[slug]/not-found.tsx, i/[slug]/opengraph-image.tsx
  api/invites/[slug]/open/route.ts, api/invites/[slug]/respond/route.ts
components/  app-header.tsx, icons.tsx, status-pill.tsx
lib/
  env.ts
  invite.ts (+ invite.test.ts)            themes, zod, expiry, status text
  recipient-flow.ts (+ .test.ts)          pure reducer
  api.ts                                   RPC result → HTTP response
  supabase/server.ts, supabase/proxy.ts
proxy.ts                          (middleware.ts on Next < 16)
supabase/migrations/20261015000000_init.sql
e2e/valentine.spec.ts, playwright.config.ts, vitest.config.ts, README.md
```

---

### Task 1: Scaffold Next.js app with design tokens and test runner

**Files:**
- Create (generator): `package.json`, `app/*`, `tsconfig.json`, `next.config.ts`, `.gitignore`, …
- Modify: `app/layout.tsx`, `app/globals.css`, `app/page.tsx`
- Create: `vitest.config.ts`, `lib/env.ts`, `components/icons.tsx`

**Interfaces:**
- Produces: Tailwind colors `rose`, `rose-deep`, `blush`, `cream`, `paper`, `field`, `wine`, `wine-soft`, `lavender`, `peach`, `ink`, `ink-2`, `muted`, `muted-2`, `line`, `line-2`, `error`; fonts `font-display`, `font-sans`. CSS classes `btn-primary`, `btn-soft`, `btn-yes`, `btn-no`, `row`, `theme-opt`, `pop-in`, `card-in`, `env*`, `fh`, `burst-p`. `supabaseEnv(): { url; key }`, `siteUrl(): string`. Icons: `HeartIcon`, `HeartOutlineIcon`, `EnvelopeIcon`, `CalendarIcon`, `CopyIcon`, `CheckIcon`, `EyeIcon`, `ClockIcon`, `XIcon`, `XCircleIcon`, `PlusIcon`, `ArrowLeftIcon`, `SendIcon`, `LogoMark`, `FlowerDecor`, `Bouquet`.

- [ ] **Step 1: Generate the app in a temp folder and merge it in** (repo already holds `docs/`, `design/`)

```bash
cd /home/nate_linux/Bootcamp
npx create-next-app@latest valentine-tmp --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm --yes
rsync -a --exclude .git valentine-tmp/ will-you-be-my-valentine/
rm -rf valentine-tmp
cd will-you-be-my-valentine
npm install @supabase/ssr @supabase/supabase-js zod nanoid
npm install -D vitest @playwright/test
node -p "require('next/package.json').version"
```
Expected: a version prints. ≥16 → `proxy.ts`; <16 → `middleware.ts` (Task 5).

- [ ] **Step 2: Scripts** — add to `package.json` `"scripts"`: `"test": "vitest run"`, `"e2e": "playwright test"`.

- [ ] **Step 3: `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname) } },
  test: { include: ['lib/**/*.test.ts'] },
})
```

- [ ] **Step 4: `lib/env.ts`**

```ts
export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY — see README')
  return { url, key }
}

export function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  return 'http://localhost:3000'
}
```

- [ ] **Step 5: `app/globals.css`** (replace generated file)

```css
@import "tailwindcss";

@theme inline {
  --color-rose: #E85D75;
  --color-rose-deep: #C94462;
  --color-blush: #FFF0F3;
  --color-cream: #FFF9F2;
  --color-paper: #FFFCF8;
  --color-field: #FFFAF6;
  --color-wine: #702D43;
  --color-wine-soft: #9A4A60;
  --color-lavender: #E9DDF8;
  --color-peach: #FFD8C2;
  --color-ink: #352B30;
  --color-ink-2: #4A3D43;
  --color-muted: #5E5157;
  --color-muted-2: #6B5F65;
  --color-line: #F1E3E6;
  --color-line-2: #EBD5DA;
  --color-error: #A3324E;
  --font-display: var(--font-playfair), Georgia, serif;
  --font-sans: var(--font-inter), system-ui, sans-serif;
}

body { margin: 0; background: var(--color-cream); color: var(--color-ink); font-family: var(--font-sans); }
a { color: var(--color-wine); } a:hover { color: var(--color-rose-deep); }
button, a, input, textarea { font-family: inherit; }
button:focus-visible, a:focus-visible, input:focus-visible, textarea:focus-visible, summary:focus-visible { outline: 3px solid #E85D75; outline-offset: 2px; }
input::placeholder, textarea::placeholder { color: #8E8187; }

.btn-primary { transition: background .18s ease, transform .18s ease; }
.btn-primary:hover { background: #B33A56 !important; color: #fff !important; transform: translateY(-1px); }
.btn-soft { transition: background .18s ease, border-color .18s ease; }
.btn-soft:hover { background: #FFF0F3 !important; border-color: #E85D75 !important; }
.btn-yes { transition: background .18s ease, transform .18s ease; }
.btn-yes:hover { background: #B33A56 !important; transform: translateY(-1px); }
.btn-no { transition: background .18s ease; }
.btn-no:hover { background: #FFF6F8 !important; }
.row { transition: background .15s ease; }
.row:hover { background: #FFF6F8 !important; }
.theme-opt { transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease; }
.theme-opt:hover { transform: translateY(-2px); }

/* Ported verbatim from design/Recipient.dc.html lines 22-47 */
.env{position:relative;width:280px;height:190px;perspective:900px}
.env-idle{animation:bob 3.2s ease-in-out infinite}
.env-back{position:absolute;inset:0;border-radius:16px;background:#F7D3DB;box-shadow:0 18px 40px rgba(112,45,67,.18)}
.env-letter{position:absolute;left:18px;right:18px;top:14px;height:150px;border-radius:10px;background:#fff;z-index:2;padding:22px 18px;box-sizing:border-box;display:flex;flex-direction:column;gap:8px}
.env-pocket{position:absolute;inset:0;border-radius:16px;background:#FCE3E8;clip-path:polygon(0 38%,50% 72%,100% 38%,100% 100%,0 100%);z-index:3}
.env-flap{position:absolute;left:0;right:0;top:0;height:62%;background:#F4BFCB;clip-path:polygon(0 0,100% 0,50% 100%);transform-origin:top center;z-index:4;border-radius:16px 16px 0 0}
.env-seal{position:absolute;left:50%;top:62%;width:50px;height:50px;margin:-25px 0 0 -25px;border-radius:50%;background:#C94462;z-index:5;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 10px rgba(112,45,67,.25)}
.opening .env-flap{animation:flapOpen .7s ease forwards}
.opening .env-seal{animation:fadeOut .25s ease forwards}
.opening .env-letter{animation:letterRise .7s .45s ease forwards}
.env-muted .env-back{background:#E6DFE3;box-shadow:none}
.env-muted .env-pocket{background:#F1ECEF}
.env-muted .env-flap{background:#DCD3D8}
.env-muted .env-seal{background:#A79CA1;box-shadow:none}
@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes flapOpen{0%{transform:rotateX(0);z-index:4}49%{z-index:4}50%{z-index:1}100%{transform:rotateX(180deg);z-index:1}}
@keyframes letterRise{to{transform:translateY(-92px)}}
@keyframes fadeOut{to{opacity:0;transform:scale(.6)}}
@keyframes cardIn{from{opacity:0;transform:translateY(28px) scale(.98)}to{opacity:1;transform:none}}
.card-in{animation:cardIn .6s cubic-bezier(.2,.8,.2,1) both}
.fh{position:absolute;bottom:-40px;opacity:0;animation-name:floatUp;animation-timing-function:linear;animation-iteration-count:infinite}
@keyframes floatUp{0%{transform:translateY(0) rotate(-8deg);opacity:0}12%{opacity:.75}85%{opacity:.45}100%{transform:translateY(-900px) rotate(18deg);opacity:0}}
.burst-p{position:absolute;left:50%;top:22%;opacity:0;animation:burst 1.7s cubic-bezier(.15,.7,.3,1) forwards}
@keyframes burst{0%{transform:translate(-50%,-50%) scale(.3);opacity:0}12%{opacity:1}75%{opacity:1}100%{transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) rotate(var(--r)) scale(1);opacity:0}}
@keyframes popIn{0%{opacity:0;transform:scale(.85)}60%{opacity:1;transform:scale(1.04)}100%{transform:scale(1)}}
.pop-in{animation:popIn .55s cubic-bezier(.2,.8,.2,1) both}
@keyframes rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
.rise{animation:rise .4s ease both}

@media (prefers-reduced-motion: reduce) {
  .env-idle,.card-in,.pop-in,.burst-p,.rise{animation:none !important}
  .burst-p,.fh{display:none}
  .opening .env-flap,.opening .env-letter,.opening .env-seal{animation-duration:.01s !important;animation-delay:0s !important}
  .theme-opt:hover{transform:none}
}
```

- [ ] **Step 6: `app/layout.tsx`**

```tsx
import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-inter' })
const playfair = Playfair_Display({ subsets: ['latin'], weight: ['500', '600', '700'], style: ['normal', 'italic'], variable: '--font-playfair' })

export const metadata: Metadata = {
  title: 'Will You Be My Valentine?',
  description: 'Write a Valentine, share a link, and find out the answer.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 7: `components/icons.tsx`** (paths copied from the design files)

```tsx
type P = { size?: number; className?: string }
const HEART = 'M12 20.5C7 16.8 3 13.6 3 9.4 3 6.6 5.1 4.5 7.8 4.5c1.7 0 3.2.9 4.2 2.3 1-1.4 2.5-2.3 4.2-2.3 2.7 0 4.8 2.1 4.8 4.9 0 4.2-4 7.4-9 11.1z'

export const HeartIcon = ({ size = 24, fill = '#E85D75', className }: P & { fill?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className}><path d={HEART} fill={fill} /></svg>
)
const stroke = (d: React.ReactNode, w = 2) => function Icon({ size = 18, className }: P) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>{d}</svg>
}
export const EnvelopeIcon = stroke(<><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M4 7l8 6 8-6" /></>)
export const CalendarIcon = stroke(<><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>)
export const CopyIcon = stroke(<><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" /></>)
export const CheckIcon = stroke(<path d="M5 12.5l4.5 4.5L19 7.5" />, 2.2)
export const EyeIcon = stroke(<><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></>)
export const ClockIcon = stroke(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>)
export const XIcon = stroke(<path d="M6 6l12 12M18 6L6 18" />, 2.2)
export const XCircleIcon = stroke(<><circle cx="12" cy="12" r="9" /><path d="M9 9l6 6M15 9l-6 6" /></>)
export const PlusIcon = stroke(<path d="M12 5v14M5 12h14" />, 2.2)
export const ArrowLeftIcon = stroke(<path d="M19 12H5M11 6l-6 6 6 6" />)
export const SendIcon = stroke(<path d="M4 12l16-8-6 16-2.5-6.5z" />)
export const HeartOutlineIcon = stroke(<path d={HEART} />)

export const LogoMark = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true">
    <rect x="3" y="8" width="30" height="21" rx="5" fill="#FFF0F3" stroke="#702D43" strokeWidth="1.6" />
    <path d="M4.5 10.5L18 20l13.5-9.5" fill="none" stroke="#702D43" strokeWidth="1.6" strokeLinejoin="round" />
    <circle cx="18" cy="21" r="6.5" fill="#E85D75" />
    <path d="M18 24.6c-2-1.5-3.4-2.7-3.4-4.2 0-1.1.8-1.9 1.8-1.9.7 0 1.2.4 1.6.9.4-.5.9-.9 1.6-.9 1 0 1.8.8 1.8 1.9 0 1.5-1.4 2.7-3.4 4.2z" fill="#FFFFFF" />
  </svg>
)

export const FlowerDecor = ({ size = 110, petal = '#F9CED8', center = '#FFD8C2', dot, className, style }: { size?: number; petal?: string; center?: string; dot?: string; className?: string; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 110 110" aria-hidden="true" className={className} style={style}>
    <circle cx="55" cy="55" r="16" fill={center} />
    <circle cx="55" cy="28" r="15" fill={petal} /><circle cx="82" cy="55" r="15" fill={petal} />
    <circle cx="55" cy="82" r="15" fill={petal} /><circle cx="28" cy="55" r="15" fill={petal} />
    {dot && <circle cx="55" cy="55" r="7" fill={dot} />}
  </svg>
)

/** design/Recipient.dc.html line 127 (yes) and 170 (no). */
export const Bouquet = ({ variant, width, height }: { variant: 'yes' | 'no'; width: number; height: number }) => {
  const c = variant === 'yes'
    ? { top: '#E85D75', l: '#F4A3B4', r: '#F4A3B4', ll: '#C9B3E6', rr: '#FFC4A6', wrap: '#FFF9F2', bow: '#E85D75' }
    : { top: '#FFC4A6', l: '#C9B3E6', r: '#F4A3B4', ll: '#F4A3B4', rr: '#C9B3E6', wrap: '#E9DDF8', bow: '#FFD8C2' }
  return (
    <svg width={width} height={height} viewBox="0 0 160 180" aria-hidden="true">
      <path d="M80 150L60 77M80 150L80 65M80 150L100 77M80 150L42 97M80 150L118 99" stroke="#5B8C72" strokeWidth="3" fill="none" strokeLinecap="round" />
      <ellipse cx="66" cy="112" rx="5" ry="12" transform="rotate(-35 66 112)" fill="#8DB59D" />
      <ellipse cx="95" cy="112" rx="5" ry="12" transform="rotate(35 95 112)" fill="#8DB59D" />
      <path d="M68 58C68 42 74 36 74 36L80 46L86 36C86 36 92 42 92 58C92 68 68 68 68 58Z" fill={c.top} />
      <path d="M48 70C48 54 54 48 54 48L60 58L66 48C66 48 72 54 72 70C72 80 48 80 48 70Z" fill={c.l} />
      <path d="M88 70C88 54 94 48 94 48L100 58L106 48C106 48 112 54 112 70C112 80 88 80 88 70Z" fill={c.r} />
      <path d="M32 90C32 77 37 72 37 72L42 80L47 72C47 72 52 77 52 90C52 98 32 98 32 90Z" fill={c.ll} />
      <path d="M108 92C108 79 113 74 113 74L118 82L123 74C123 74 128 79 128 92C128 100 108 100 108 92Z" fill={c.rr} />
      <path d="M40 112L80 172L120 112Z" fill={c.wrap} stroke="#702D43" strokeWidth="2" strokeLinejoin="round" />
      <path d="M80 128C68 118 62 134 80 131C98 134 92 118 80 128Z" fill={c.bow} {...(variant === 'no' ? { stroke: '#702D43', strokeWidth: 1.5 } : {})} />
      {variant === 'yes' && <path d="M80 130L72 146M80 130L88 146" stroke="#E85D75" strokeWidth="2.5" strokeLinecap="round" />}
    </svg>
  )
}
```

- [ ] **Step 8: `app/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
export default function Home() { redirect('/login') }
```

- [ ] **Step 9: Verify**

Run: `npm run build && npx vitest run --passWithNoTests`
Expected: build succeeds; vitest exits 0.

- [ ] **Step 10: Commit**

```bash
git add -A && git commit -m "chore: scaffold Next.js app with design tokens and test runner"
```

---

### Task 2: Invite domain logic (schemas, expiry, status text)

**Files:**
- Create: `lib/invite.ts`
- Test: `lib/invite.test.ts`

**Interfaces:**
- Produces:
  - `type ThemeId = 'blush' | 'lavender' | 'peach'`; `type Theme = { id; name; desc; bg; accent; decor; ink; chip; av; avFg }`; `THEMES: Record<ThemeId, Theme>`; `THEME_LIST: Theme[]`
  - `type InviteStatus = 'sent' | 'opened' | 'accepted' | 'declined'`; `type DisplayStatus = 'pending' | 'accepted' | 'declined' | 'expired'`
  - `type InviteRow = { id; share_slug; recipient_name; message; date_plan: string | null; signed_as: string | null; theme: ThemeId; status: InviteStatus; opened_at: string | null; responded_at: string | null; expires_at: string; created_at: string }`
  - `type PublicInvite = Pick<InviteRow, 'recipient_name' | 'message' | 'date_plan' | 'signed_as' | 'theme' | 'status' | 'expires_at'>`
  - `inviteInput` (zod) → `{ recipientName: string; message: string; datePlan: string | null; signedAs: string | null; theme: ThemeId }`
  - `answerInput` (zod) → `{ answer: 'accepted' | 'declined' }`; `SLUG_RE`
  - `expiresAtFor(now: Date): Date`; `isExpired(row, now?)`; `deriveStatus(row, now?): DisplayStatus`
  - `activityText(row: InviteRow, now?): string`; `responseSummary(row: InviteRow, now?): { title; detail }`
  - `fmtDay(iso)`, `fmtDateTime(iso)`; `STATUS_STYLE: Record<DisplayStatus, { label; bg; fg; dot }>`

- [ ] **Step 1: Write the failing tests** — `lib/invite.test.ts`

```ts
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
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run lib/invite.test.ts`
Expected: FAIL — cannot resolve `./invite`.

- [ ] **Step 3: Implement `lib/invite.ts`**

```ts
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

const optional = (max: number) => z.string().trim().max(max).optional().transform((v) => v || null)

export const inviteInput = z.object({
  recipientName: z.string().trim().min(1, 'Add their name so the card can greet them.').max(40),
  message: z.string().trim().max(280).default(''),
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/invite.test.ts`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/invite.ts lib/invite.test.ts && git commit -m "feat: invite schemas, expiry and status text"
```

---

### Task 3: Recipient flow reducer

**Files:**
- Create: `lib/recipient-flow.ts`
- Test: `lib/recipient-flow.test.ts`

**Interfaces:**
- Consumes: `InviteStatus` (Task 2).
- Produces: `type Screen = 'envelope' | 'opening' | 'card' | 'letterAgain' | 'accepted' | 'decline1' | 'decline2' | 'done' | 'expired'`; `type FlowState = { screen: Screen; declines: number; burst: boolean }`; `type FlowEvent = { type: 'open' | 'opened' | 'yes' | 'no' | 'reconsider' | 'keepNo' | 'takeCare' | 'readAgain' | 'backToSurprise' | 'changeAnswer' }`; `initialFlow(status, expired): FlowState`; `step(state, event): { state: FlowState; post: 'accepted' | 'declined' | null }`.

- [ ] **Step 1: Write the failing tests** — `lib/recipient-flow.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { initialFlow, step, type FlowEvent, type FlowState } from './recipient-flow'

const run = (s: FlowState, ...types: FlowEvent['type'][]) => {
  const posts: string[] = []
  for (const type of types) { const r = step(s, { type }); s = r.state; if (r.post) posts.push(r.post) }
  return { s, posts }
}
const fresh = initialFlow('sent', false)

describe('initialFlow', () => {
  it('starts at the envelope for unanswered invites', () => {
    expect(fresh).toEqual({ screen: 'envelope', declines: 0, burst: true })
    expect(initialFlow('opened', false).screen).toBe('envelope')
  })
  it('shows expired only for unanswered invites past expiry', () => {
    expect(initialFlow('opened', true).screen).toBe('expired')
  })
  it('revisits answered invites even after expiry', () => {
    expect(initialFlow('accepted', true)).toEqual({ screen: 'accepted', declines: 0, burst: false })
    expect(initialFlow('declined', true).screen).toBe('done')
  })
})

describe('step', () => {
  it('opens the envelope into the card', () => {
    expect(run(fresh, 'open').s.screen).toBe('opening')
    expect(run(fresh, 'open', 'opened').s.screen).toBe('card')
  })
  it('Yes posts accepted with confetti', () => {
    const { s, posts } = run(fresh, 'open', 'opened', 'yes')
    expect(s).toEqual({ screen: 'accepted', declines: 0, burst: true })
    expect(posts).toEqual(['accepted'])
  })
  it('first No asks once and posts nothing', () => {
    const { s, posts } = run(fresh, 'open', 'opened', 'no')
    expect(s.screen).toBe('decline1')
    expect(posts).toEqual([])
  })
  it('"Yes, I’m sure" ends with the bouquet and posts declined', () => {
    const { s, posts } = run(fresh, 'open', 'opened', 'no', 'keepNo')
    expect(s.screen).toBe('decline2')
    expect(posts).toEqual(['declined'])
  })
  it('a second No from the card also ends — never a third ask', () => {
    const { s, posts } = run(fresh, 'open', 'opened', 'no', 'reconsider', 'no')
    expect(s.screen).toBe('decline2')
    expect(posts).toEqual(['declined'])
  })
  it('reconsider then Yes posts only accepted', () => {
    expect(run(fresh, 'open', 'opened', 'no', 'reconsider', 'yes').posts).toEqual(['accepted'])
  })
  it('bouquet → take care → done', () => {
    expect(run(fresh, 'open', 'opened', 'no', 'keepNo', 'takeCare').s.screen).toBe('done')
  })
  it('read again and back to the surprise without re-posting or re-bursting', () => {
    const { s, posts } = run(fresh, 'open', 'opened', 'yes', 'readAgain', 'backToSurprise')
    expect(s).toEqual({ screen: 'accepted', declines: 0, burst: false })
    expect(posts).toEqual(['accepted'])
  })
  it('change my answer returns to the card with a fresh No count', () => {
    const { s } = run(initialFlow('declined', false), 'changeAnswer')
    expect(s).toEqual({ screen: 'card', declines: 0, burst: true })
    expect(run(s, 'no').s.screen).toBe('decline1')
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run lib/recipient-flow.test.ts`
Expected: FAIL — cannot resolve `./recipient-flow`.

- [ ] **Step 3: Implement `lib/recipient-flow.ts`**

```ts
import type { InviteStatus } from './invite'

export type Screen = 'envelope' | 'opening' | 'card' | 'letterAgain' | 'accepted' | 'decline1' | 'decline2' | 'done' | 'expired'
export type FlowState = { screen: Screen; declines: number; burst: boolean }
export type FlowEvent = { type: 'open' | 'opened' | 'yes' | 'no' | 'reconsider' | 'keepNo' | 'takeCare' | 'readAgain' | 'backToSurprise' | 'changeAnswer' }
type Post = 'accepted' | 'declined' | null

export function initialFlow(status: InviteStatus, expired: boolean): FlowState {
  if (status === 'accepted') return { screen: 'accepted', declines: 0, burst: false }
  if (status === 'declined') return { screen: 'done', declines: 0, burst: true }
  return { screen: expired ? 'expired' : 'envelope', declines: 0, burst: true }
}

// The No count only lives here; only the final answer is ever posted.
export function step(state: FlowState, { type }: FlowEvent): { state: FlowState; post: Post } {
  const to = (patch: Partial<FlowState>, post: Post = null) => ({ state: { ...state, ...patch }, post })
  switch (type) {
    case 'open': return to({ screen: 'opening' })
    case 'opened': return to({ screen: 'card' })
    case 'yes': return to({ screen: 'accepted', burst: true }, 'accepted')
    case 'no': return state.declines >= 1 ? to({ screen: 'decline2', declines: 2 }, 'declined') : to({ screen: 'decline1', declines: 1 })
    case 'reconsider': return to({ screen: 'card' })
    case 'keepNo': return to({ screen: 'decline2', declines: 2 }, 'declined')
    case 'takeCare': return to({ screen: 'done' })
    case 'readAgain': return to({ screen: 'letterAgain' })
    case 'backToSurprise': return to({ screen: 'accepted', burst: false })
    case 'changeAnswer': return to({ screen: 'card', declines: 0, burst: true })
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run`
Expected: all PASS (both files).

- [ ] **Step 5: Commit**

```bash
git add lib/recipient-flow.ts lib/recipient-flow.test.ts && git commit -m "feat: recipient flow reducer with two-No rule"
```

---

### Task 4: Database migration + Supabase project (needs the user)

**Files:**
- Create: `supabase/migrations/20261015000000_init.sql`, `.env.example`, `.env.local` (git-ignored)

**Interfaces:**
- Produces (schema `public`): tables `profiles`, `invites`; functions `get_public_invite(p_slug text)` → rows of `PublicInvite` columns; `mark_invite_opened(p_slug text) returns text`; `respond_to_invite(p_slug text, p_answer text) returns text`. Text results: `'not_found' | 'expired' | <status>`.

- [ ] **Step 1: Write the migration** — `supabase/migrations/20261015000000_init.sql`

```sql
create type public.invite_status as enum ('sent', 'opened', 'accepted', 'declined');
create type public.invite_theme as enum ('blush', 'lavender', 'peach');

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  created_at timestamptz not null default now()
);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null default auth.uid() references auth.users on delete cascade,
  share_slug text not null unique check (share_slug ~ '^[A-Za-z0-9_-]{21}$'),
  recipient_name text not null check (char_length(btrim(recipient_name)) between 1 and 40),
  message text not null default '' check (char_length(message) <= 280),
  date_plan text check (char_length(date_plan) <= 120),
  signed_as text check (char_length(signed_as) <= 40),
  theme public.invite_theme not null default 'blush',
  status public.invite_status not null default 'sent',
  opened_at timestamptz,
  responded_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index invites_sender_created_idx on public.invites (sender_id, created_at desc);

-- RLS: senders see and create only their own rows. No update/delete policies on invites.
alter table public.profiles enable row level security;
create policy "read own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "update own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id);

alter table public.invites enable row level security;
create policy "read own invites" on public.invites for select to authenticated using ((select auth.uid()) = sender_id);
create policy "create own invites" on public.invites for insert to authenticated with check ((select auth.uid()) = sender_id);

-- Profile row on sign-up
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(coalesce(nullif(btrim(new.raw_user_meta_data->>'display_name'), ''), split_part(new.email, '@', 1)), 40));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Recipient access (anonymous), keyed by slug; exposes no ids or sender_id
create function public.get_public_invite(p_slug text)
returns table (recipient_name text, message text, date_plan text, signed_as text, theme public.invite_theme, status public.invite_status, expires_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select i.recipient_name, i.message, i.date_plan, i.signed_as, i.theme, i.status, i.expires_at
  from public.invites i where i.share_slug = p_slug;
$$;

create function public.mark_invite_opened(p_slug text) returns text
language plpgsql security definer set search_path = '' as $$
declare v public.invites%rowtype;
begin
  select * into v from public.invites where share_slug = p_slug for update;
  if not found then return 'not_found'; end if;
  if v.status in ('sent', 'opened') and v.expires_at < now() then return 'expired'; end if;
  if v.status = 'sent' then
    update public.invites set status = 'opened', opened_at = now() where id = v.id;
    return 'opened';
  end if;
  return v.status::text;
end $$;

create function public.respond_to_invite(p_slug text, p_answer text) returns text
language plpgsql security definer set search_path = '' as $$
declare v public.invites%rowtype;
begin
  if p_answer not in ('accepted', 'declined') then raise exception 'invalid answer'; end if;
  select * into v from public.invites where share_slug = p_slug for update;
  if not found then return 'not_found'; end if;
  if v.expires_at < now() then return 'expired'; end if;
  update public.invites
     set status = p_answer::public.invite_status, responded_at = now(), opened_at = coalesce(opened_at, now())
   where id = v.id;
  return p_answer;
end $$;

revoke execute on function public.get_public_invite(text), public.mark_invite_opened(text), public.respond_to_invite(text, text), public.handle_new_user() from public, anon, authenticated;
grant execute on function public.get_public_invite(text), public.mark_invite_opened(text), public.respond_to_invite(text, text) to anon, authenticated;

-- Daily cleanup 30 days after expiry
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('delete-old-invites', '0 3 * * *', $$delete from public.invites where expires_at < now() - interval '30 days'$$);
```

- [ ] **Step 2: User creates the Supabase project** (ask; wait)

supabase.com → New project (region: Southeast Asia / Singapore), save the DB password. Authentication → Sign In / Providers → Email → turn **Confirm email** off. Project Settings → API: copy Project URL and anon (or publishable) key.

- [ ] **Step 3: Link and push** (user runs the interactive login)

```bash
! npx supabase login
npx supabase init          # creates supabase/config.toml; keep existing migrations
npx supabase link --project-ref <ref>
npx supabase db push
```
Expected: `Applying migration 20261015000000_init.sql...` then `Finished supabase db push.` If `pg_cron` errors: enable it in Dashboard → Database → Extensions, remove the `create extension` line, re-run.

- [ ] **Step 4: Env files** — `.env.example` (committed):

```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon or publishable key>
# Optional; on Vercel the production domain is used automatically
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```
`.env.local`: same keys, real values. Confirm `.env*` is git-ignored and `.env.example` is not (add `!.env.example` to `.gitignore` if needed).

- [ ] **Step 5: Verify RLS + functions from outside**

```bash
set -a; . ./.env.local; set +a
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/invites?select=*" -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"
curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/rpc/respond_to_invite" -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" -H "Content-Type: application/json" -d '{"p_slug":"aaaaaaaaaaaaaaaaaaaaa","p_answer":"accepted"}'
```
Expected: `[]` then `"not_found"`.

- [ ] **Step 6: Commit**

```bash
git add supabase .env.example .gitignore && git commit -m "feat(db): invites schema, RLS and recipient functions"
```

---

### Task 5: Auth — Supabase clients, session proxy, login page, header

**Files:**
- Create: `lib/supabase/server.ts`, `lib/supabase/proxy.ts`, `proxy.ts` (or `middleware.ts`), `app/login/actions.ts`, `app/login/login-form.tsx`, `app/login/page.tsx`, `components/app-header.tsx`

**Interfaces:**
- Consumes: `supabaseEnv()`, `LogoMark`.
- Produces: `createClient(): Promise<SupabaseClient>`; `signIn(prev: AuthState, fd)`, `signUp(prev, fd)`, `signOut()`; `type AuthState = { error?: string; field?: 'name' | 'email' | 'password' }`; `<AppHeader name={string} />`.

- [ ] **Step 1: `lib/supabase/server.ts`**

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseEnv } from '@/lib/env'

export async function createClient() {
  const cookieStore = await cookies()
  const { url, key } = supabaseEnv()
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(toSet) {
        try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }
        catch { /* Server Component render; the proxy refreshes the session */ }
      },
    },
  })
}
```

- [ ] **Step 2: `lib/supabase/proxy.ts`**

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseEnv } from '@/lib/env'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const { url, key } = supabaseEnv()
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(toSet) {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })
  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const target =
    path === '/' ? (user ? '/dashboard' : '/login')
    : !user && (path.startsWith('/dashboard') || path.startsWith('/create')) ? '/login'
    : user && path === '/login' ? '/dashboard'
    : null
  if (!target) return response

  const redirect = NextResponse.redirect(new URL(target, request.url))
  response.cookies.getAll().forEach((c) => redirect.cookies.set(c))
  return redirect
}
```

- [ ] **Step 3: `proxy.ts`** (Next ≥16; on <16 name it `middleware.ts` and export `middleware`)

```ts
import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = { matcher: ['/', '/login', '/dashboard/:path*', '/create/:path*'] }
```

- [ ] **Step 4: `app/login/actions.ts`**

```ts
'use server'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export type AuthState = { error?: string; field?: 'name' | 'email' | 'password' }

const creds = z.object({
  email: z.string().trim().email('Enter a valid email.'),
  password: z.string().min(8, 'Use at least 8 characters.'),
})
const signUpInput = creds.extend({ name: z.string().trim().min(1, 'Tell us your name.').max(40) })

const firstIssue = (e: z.ZodError): AuthState => ({ error: e.issues[0].message, field: e.issues[0].path[0] as AuthState['field'] })

export async function signIn(_: AuthState, fd: FormData): Promise<AuthState> {
  const parsed = creds.safeParse(Object.fromEntries(fd))
  if (!parsed.success) return firstIssue(parsed.error)
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) return { error: 'That email and password don’t match.', field: 'password' }
  redirect('/dashboard')
}

export async function signUp(_: AuthState, fd: FormData): Promise<AuthState> {
  const parsed = signUpInput.safeParse(Object.fromEntries(fd))
  if (!parsed.success) return firstIssue(parsed.error)
  const { name, email, password } = parsed.data
  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: name } } })
  if (error) return { error: error.message, field: 'email' }
  redirect('/dashboard')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
```

- [ ] **Step 5: `app/login/login-form.tsx` + `app/login/page.tsx`**

```tsx
'use client'
import { useActionState, useState } from 'react'
import { LogoMark } from '@/components/icons'
import { signIn, signUp, type AuthState } from './actions'

function AuthForm({ mode, onToggle }: { mode: 'in' | 'up'; onToggle: () => void }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === 'in' ? signIn : signUp, {})
  const err = (f: AuthState['field']) => (state.field === f ? state.error : undefined)
  const input = (name: 'name' | 'email' | 'password', label: string, type: string, autoComplete: string) => (
    <div className="flex flex-col gap-2">
      <label htmlFor={`f-${name}`} className="font-semibold">{label}</label>
      <input id={`f-${name}`} name={name} type={type} autoComplete={autoComplete} required
        aria-invalid={!!err(name)} aria-describedby={err(name) ? `f-${name}-err` : undefined}
        className={`min-h-12 rounded-[14px] border-[1.5px] bg-field px-3.5 text-base text-ink ${err(name) ? 'border-error' : 'border-line-2'}`} />
      {err(name) && <span id={`f-${name}-err`} className="text-[13px] text-error">{err(name)}</span>}
    </div>
  )
  return (
    <form action={action} className="flex w-full max-w-[420px] flex-col gap-5 rounded-3xl border border-line bg-white p-7 shadow-[0_8px_28px_rgba(112,45,67,0.06)]">
      <div className="flex items-center gap-3"><LogoMark /><span className="font-display text-xl font-semibold text-wine">Will You Be My Valentine?</span></div>
      <h1 className="m-0 font-display text-[32px] font-semibold leading-tight text-wine">
        {mode === 'in' ? 'Sign in to write a Valentine' : 'Create your account'}
      </h1>
      {mode === 'up' && input('name', 'Your name', 'text', 'given-name')}
      {input('email', 'Email', 'email', 'email')}
      {input('password', 'Password', 'password', mode === 'in' ? 'current-password' : 'new-password')}
      <button type="submit" disabled={pending} className="btn-primary min-h-14 cursor-pointer rounded-2xl border-none bg-rose-deep text-[17px] font-semibold text-white shadow-[0_8px_20px_rgba(201,68,98,0.25)]">
        {pending ? 'One moment…' : mode === 'in' ? 'Sign in' : 'Create account'}
      </button>
      <button type="button" onClick={onToggle} className="min-h-11 cursor-pointer self-center border-none bg-transparent font-medium text-wine underline">
        {mode === 'in' ? 'New here? Create an account' : 'Already have an account? Sign in'}
      </button>
    </form>
  )
}

export function LoginForm() {
  const [mode, setMode] = useState<'in' | 'up'>('in')
  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-4 py-12">
      {/* key resets the action state when switching modes */}
      <AuthForm key={mode} mode={mode} onToggle={() => setMode(mode === 'in' ? 'up' : 'in')} />
    </main>
  )
}
```

```tsx
// app/login/page.tsx
import { LoginForm } from './login-form'
export const metadata = { title: 'Sign in · Will You Be My Valentine?' }
export default function LoginPage() { return <LoginForm /> }
```

- [ ] **Step 6: `components/app-header.tsx`** — `design/Main.dc.html` lines 28–41 without the prototype badge; avatar → `<details>` menu:

```tsx
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
```

- [ ] **Step 7: Verify manually**

`npm run dev` → http://localhost:3000. Expected: `/` → `/login`; create an account → `/dashboard` (404 until Task 8 is fine); Supabase `profiles` has the row; visiting `/login` while signed in → `/dashboard`.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat(auth): Supabase session proxy and login page"
```

---

### Task 6: Create invitation page

**Files:**
- Create: `app/create/actions.ts`, `app/create/page.tsx`, `app/create/create-form.tsx`

**Interfaces:**
- Consumes: `inviteInput`, `expiresAtFor`, `THEMES`, `THEME_LIST`, `ThemeId`; `createClient`; `AppHeader`; `siteUrl()`; icons.
- Produces: `createInvite(prev: CreateState, fd: FormData): Promise<CreateState>`; `type CreateState = { slug?: string; error?: string }`. Form field names: `recipientName`, `message`, `datePlan`, `signedAs`, `theme`.

- [ ] **Step 1: `app/create/actions.ts`**

```ts
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
```

- [ ] **Step 2: `app/create/page.tsx`**

```tsx
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
```

- [ ] **Step 3: `app/create/create-form.tsx`** — logic below; JSX ported from `design/Create.dc.html`:
  - `<main>`, back link (→ `/dashboard`), title: lines 43–54
  - form (when `!done`): lines 58–111 → `<form action={action} onSubmit={onSubmit}>`; inputs get `name=` per Interfaces and `value`/`onChange` bound to state (recipient onChange also `setNameError(false)`); counter `{message.length} / 280`; error span shows `error`; theme buttons `THEME_LIST.map(t => …aria-pressed={t.id === theme} onClick={() => setTheme(t.id)})` + `<input type="hidden" name="theme" value={theme} />`; submit `disabled={pending}`, label `pending ? 'Sealing…' : 'Create Invitation'`
  - success panel (when `done`): lines 114–143, `role="status"`, class `rise`; link input `id="new-link"` value `link`; remove the "Simulated placeholder link…" note; add a **Share** button (same style as Copy, `SendIcon`) only when `canShare`; "Preview as {recipientDisplay}" → `/i/${done}?preview=1`; "Back to dashboard" → `/dashboard`; "Write another invitation" → `reset`
  - live preview aside: lines 145–170 with `th`, `recipientDisplay`, `messageDisplay`, `plan`, `signoff`

```tsx
'use client'
import Link from 'next/link'
import { useActionState, useEffect, useState } from 'react'
import { THEMES, THEME_LIST, type ThemeId } from '@/lib/invite'
import { ArrowLeftIcon, CalendarIcon, CheckIcon, CopyIcon, EyeIcon, FlowerDecor, HeartIcon, SendIcon } from '@/components/icons'
import { createInvite, type CreateState } from './actions'

export function CreateForm({ siteUrl }: { siteUrl: string }) {
  const [state, action, pending] = useActionState<CreateState, FormData>(createInvite, {})
  const [recipient, setRecipient] = useState('')
  const [message, setMessage] = useState('')
  const [plan, setPlan] = useState('')
  const [sender, setSender] = useState('')
  const [theme, setTheme] = useState<ThemeId>('blush')
  const [nameError, setNameError] = useState(false)
  const [copied, setCopied] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const [canShare, setCanShare] = useState(false)

  useEffect(() => { if (state.slug) setDone(state.slug) }, [state])
  useEffect(() => { setCanShare(!!navigator.share) }, [])

  const th = THEMES[theme]
  const name = recipient.trim()
  const recipientDisplay = name || 'your Valentine'
  const messageDisplay = message.trim() || 'Your message will appear here.'
  const signoff = sender.trim() ? `With love, ${sender.trim()}` : 'With love, your secret admirer'
  const link = done ? `${siteUrl}/i/${done}` : ''
  const error = nameError ? 'Add their name so the card can greet them.' : state.error

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => { if (!name) { e.preventDefault(); setNameError(true) } }
  const copy = async () => {
    try { await navigator.clipboard.writeText(link) } catch {}
    setCopied(true); setTimeout(() => setCopied(false), 1800)
  }
  const share = () => navigator.share({ title: 'A letter for you 💌', url: link }).catch(() => {})
  const reset = () => { setDone(null); setRecipient(''); setMessage(''); setPlan(''); setNameError(false); setCopied(false) }

  return null // ← ported JSX per the list above
}
```

- [ ] **Step 4: Verify manually**

`npm run dev` → sign in → `/create`. Expected: preview updates per keystroke/theme; empty name shows the error and doesn't submit; valid submit shows "Your letter for Mika is sealed" with `http://localhost:3000/i/<21 chars>`; Copy → "Copied!"; `invites` row has `status = sent`, `expires_at = 2027-02-15 15:59:59+00`.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: create invitation page with live preview"
```

---

### Task 7: Recipient page + API routes

**Files:**
- Create: `lib/api.ts`, `app/api/invites/[slug]/open/route.ts`, `app/api/invites/[slug]/respond/route.ts`, `app/i/[slug]/page.tsx`, `app/i/[slug]/recipient-flow.tsx`, `app/i/[slug]/not-found.tsx`, `app/i/[slug]/opengraph-image.tsx`

**Interfaces:**
- Consumes: `createClient`; `answerInput`, `SLUG_RE`, `isExpired`, `PublicInvite`, `THEMES`; `initialFlow`, `step`, `FlowEvent`, `FlowState`; icons.
- Produces: `POST /api/invites/:slug/open` → `200 {status}` | `404` | `410`; `POST /api/invites/:slug/respond` `{answer}` → `200 {status}` | `400` | `404` | `410`. `<RecipientFlow invite slug preview expired canChange />`.

- [ ] **Step 1: `lib/api.ts`**

```ts
import { NextResponse } from 'next/server'

export function rpcResponse(result: unknown, error: unknown) {
  if (error) return NextResponse.json({ error: 'server_error' }, { status: 500 })
  if (result === 'not_found') return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (result === 'expired') return NextResponse.json({ error: 'expired' }, { status: 410 })
  return NextResponse.json({ status: result })
}
```

- [ ] **Step 2: Route handlers**

```ts
// app/api/invites/[slug]/open/route.ts
import { createClient } from '@/lib/supabase/server'
import { rpcResponse } from '@/lib/api'

export async function POST(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('mark_invite_opened', { p_slug: slug })
  return rpcResponse(data, error)
}
```

```ts
// app/api/invites/[slug]/respond/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rpcResponse } from '@/lib/api'
import { answerInput } from '@/lib/invite'

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const parsed = answerInput.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('respond_to_invite', { p_slug: slug, p_answer: parsed.data.answer })
  return rpcResponse(data, error)
}
```

- [ ] **Step 3: `app/i/[slug]/page.tsx`**

```tsx
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
  return <RecipientFlow invite={invite} slug={slug} preview={preview === '1'}
    expired={isExpired(invite, now)} canChange={new Date(invite.expires_at) > now} />
}
```

- [ ] **Step 4: `app/i/[slug]/recipient-flow.tsx`** — logic below; JSX ported from `design/Recipient.dc.html`:
  - frame line 51 → `<div className="relative mx-auto min-h-[100dvh] w-full max-w-[390px] overflow-hidden" style={{ background: th.bg }}>` inside a full-width wrapper with the same background
  - background flowers 53–54 (`FlowerDecor`), floating hearts 56–62 (`HEARTS`; hidden on `expired`/`done`)
  - `envelope`/`opening`: 64–88 (`env ${opening ? 'opening' : 'env-idle'}`; headline `{recipient_name}, you’ve got mail`; "From {signed_as}" line only when `signed_as`; button `disabled={opening}`, label `opening ? 'Opening…' : 'Open your letter'`)
  - `card`/`letterAgain`: 90–115 (`Dear {recipient_name},`; message; plan chip only when `date_plan`; sign-off `With love, {signed_as}` or `With love, your secret admirer`; Yes/No → `dispatch('yes'|'no')`; letterAgain block → `dispatch('backToSurprise')`)
  - `accepted`: 117–152 (burst `{state.burst && <div key={burstKey}>…PIECES…</div>}`; ticket only when `date_plan`, its title = `date_plan`, drop the FEB/14 badge, "Saturday · 7:00 PM" and pick-up note; replace the "Sam is going to be over the moon" line with `${from} is going to be over the moon.` where `from = signed_as ?? 'Your Valentine'`; "Your answer was sent to {signed_as ?? 'them'}"; Replay → `replay`; Read again → `dispatch('readAgain')`)
  - `decline1`: 154–166 with heading **Okay! Just double-checking 💌**, both buttons `btn-no` outline style; Let me reconsider → `dispatch('reconsider')`; Yes, I’m sure → `dispatch('keepNo')`
  - `decline2`: 168–175 (`Bouquet variant="no"`; Take care! 💐 → `dispatch('takeCare')`)
  - `done`: 177–183 (`Take care, {recipient_name}`; `Your reply has been sent{signed_as ? ` to ${signed_as}` : ''}. Thanks for being honest — and kind about it.`)
  - `expired`: 185–199 (`The link {signed_as ?? 'they'} sent is no longer active…`)
  - On `accepted` and `done`, when `canChange && !preview`: underlined text button **Change my answer** → `dispatch('changeAnswer')`
  - When `preview`: pill at top `Preview — your answer won’t be sent`
  - When `failed`: fixed bottom toast button `Couldn’t send — tap to try again` → `retry`, `role="alert"`
  - Headings/sign-offs use `th.ink` instead of `#702D43`; decor uses `th.decor`; answer buttons stay rose.

```tsx
'use client'
import { useEffect, useReducer, useRef, useState } from 'react'
import { THEMES, type PublicInvite } from '@/lib/invite'
import { initialFlow, step, type FlowEvent, type FlowState } from '@/lib/recipient-flow'
import { Bouquet, CalendarIcon, CheckIcon, FlowerDecor, HeartIcon } from '@/components/icons'

const COLORS = ['#E85D75', '#F4A3B4', '#C9B3E6', '#FFC4A6', '#F9CED8']
// Same values as design/Recipient.dc.html lines 219-238
const HEARTS = [[6, 16, 13, -2], [18, 11, 16, -9], [30, 20, 14, -5], [44, 12, 18, -12], [57, 15, 15, -1], [68, 22, 17, -7], [80, 12, 14, -11], [90, 17, 19, -4], [50, 10, 21, -15]]
  .map(([left, size, dur, delay], i) => ({ color: COLORS[i % 5], style: { left: `${left}%`, width: size, height: size, animationDuration: `${dur}s`, animationDelay: `${delay}s` } }))
const PIECES = Array.from({ length: 24 }, (_, i) => {
  const a = (i / 24) * Math.PI * 2 + (i % 3) * 0.12, d = 120 + (i % 5) * 22, size = 12 + (i % 4) * 4
  return { color: COLORS[i % 5], style: { width: size, height: size, '--dx': `${Math.round(Math.cos(a) * d)}px`, '--dy': `${Math.round(Math.sin(a) * d * 0.9 + 60)}px`, '--r': `${(i % 2 ? 1 : -1) * (20 + i * 7)}deg`, animationDelay: `${((i % 6) * 0.04).toFixed(2)}s` } as React.CSSProperties }
})

type Props = { invite: PublicInvite; slug: string; preview: boolean; expired: boolean; canChange: boolean }

export function RecipientFlow({ invite, slug, preview, expired, canChange }: Props) {
  const [state, setState] = useState<FlowState>(() => initialFlow(invite.status, expired))
  const [failed, setFailed] = useState<null | 'accepted' | 'declined'>(null)
  const [burstKey, replay] = useReducer((n: number) => n + 1, 0) // re-key restarts the CSS burst
  const opened = useRef(false)
  const th = THEMES[invite.theme]

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
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answer }),
      })
      if (!res.ok) throw new Error(String(res.status))
    } catch { setFailed(answer) }
  }

  function dispatch(type: FlowEvent['type']) {
    const r = step(state, { type })
    setState(r.state)
    if (r.post) send(r.post)
    if (type === 'open') setTimeout(() => setState((s) => step(s, { type: 'opened' }).state), 1250)
  }
  const retry = () => { if (failed) send(failed) }

  return null // ← ported JSX per the list above, switching on state.screen
}
```

- [ ] **Step 5: `app/i/[slug]/not-found.tsx`**

```tsx
import { EnvelopeIcon } from '@/components/icons'

export default function LostLetter() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-blush px-8 text-center">
      <span className="text-rose"><EnvelopeIcon size={48} /></span>
      <h1 className="m-0 font-display text-[30px] font-semibold text-wine">This letter got lost in the mail</h1>
      <p className="m-0 max-w-[300px] text-muted">The link may be mistyped. Ask the sender to share it again.</p>
    </main>
  )
}
```

- [ ] **Step 6: `app/i/[slug]/opengraph-image.tsx`**

```tsx
import { ImageResponse } from 'next/og'

export const alt = 'Someone has a question for you'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 40, background: '#FFF0F3' }}>
        <div style={{ width: 420, height: 280, borderRadius: 28, background: '#F7D3DB', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 24px 60px rgba(112,45,67,.18)' }}>
          <div style={{ width: 96, height: 96, borderRadius: 48, background: '#C94462', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 52 }}>♥</div>
        </div>
        <div style={{ fontSize: 60, color: '#702D43', fontWeight: 700 }}>Someone has a question for you</div>
      </div>
    ),
    size,
  )
}
```

- [ ] **Step 7: Verify manually** (private window)

Open a Task 6 share link. Expected: envelope → open → card; No → "Okay! Just double-checking 💌" with two outline buttons → "Yes, I’m sure" → bouquet → Take care → done with "Change my answer". DB row: `declined`, `responded_at` and `opened_at` set. Reload → done screen. `/i/hello` → lost-letter page. `?preview=1` on a fresh invite → row stays `sent`.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: recipient flow page and response API"
```

---

### Task 8: Sender dashboard

**Files:**
- Create: `components/status-pill.tsx`, `app/dashboard/page.tsx`, `app/dashboard/dashboard-view.tsx`

**Interfaces:**
- Consumes: `InviteRow`, `DisplayStatus`, `deriveStatus`, `activityText`, `responseSummary`, `fmtDay`, `fmtDateTime`, `STATUS_STYLE`, `THEMES`; `AppHeader`; `createClient`; `siteUrl()`; icons.
- Produces: `<StatusPill status small? />`; `<DashboardView name invites siteUrl />`.

- [ ] **Step 1: `components/status-pill.tsx`**

```tsx
import { STATUS_STYLE, type DisplayStatus } from '@/lib/invite'

export function StatusPill({ status, small }: { status: DisplayStatus; small?: boolean }) {
  const s = STATUS_STYLE[status]
  return (
    <span className={`inline-flex items-center gap-1.5 self-start justify-self-start rounded-full font-semibold ${small ? 'px-2.5 py-0.5 text-xs' : 'px-2.5 py-1 text-[13px]'}`} style={{ background: s.bg, color: s.fg }}>
      <span aria-hidden="true" className="size-[7px] rounded-full" style={{ background: s.dot }} />{s.label}
    </span>
  )
}
```

- [ ] **Step 2: `app/dashboard/page.tsx`**

```tsx
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
```

- [ ] **Step 3: `app/dashboard/dashboard-view.tsx`** — logic below; JSX ported from `design/Main.dc.html`:
  - title row 45–54 (`Hi {name}`; "New invitation" → `/create`)
  - **skip** prototype banner 56–59
  - empty state 61–68 when `invites.length === 0` (link → `/create`)
  - stat cards 73–106 from `counts` (`${counts.expired} expired without a reply`)
  - table 110–149: `TABS` chips (`${label} · ${id === 'all' ? counts.total : counts[id]}`, `aria-pressed`), rows from `visible` (each row div keeps class `row`; avatar from `THEMES[inv.theme].av/avFg`; `<StatusPill status={status} />`; `activityText(inv)`; sent = `fmtDay(inv.created_at)`; Copy → `copy(inv)`, label `copiedId === inv.id ? 'Copied!' : 'Copy link'`; Details → `setSelectedId(inv.id)`; selected row bg `#FFF0F3`), empty filter message
  - details aside 151–205 when `selected`: `responseSummary(selected.inv)` title/detail; `<StatusPill status={selected.status} small />`; message; `date_plan ?? 'No plan added'`; `fmtDateTime(created_at)`; theme name; expires `fmtDay(expires_at)`; link `linkFor(inv)` + copy; drop "Simulated link" note; "Preview as recipient" → `/i/${share_slug}?preview=1`; close → `setSelectedId(null)`; otherwise the "Pick an invitation" panel

```tsx
'use client'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { activityText, deriveStatus, fmtDateTime, fmtDay, responseSummary, THEMES, type DisplayStatus, type InviteRow } from '@/lib/invite'
import { StatusPill } from '@/components/status-pill'
import { ClockIcon, CopyIcon, EnvelopeIcon, EyeIcon, HeartOutlineIcon, PlusIcon, XCircleIcon, XIcon } from '@/components/icons'

type Filter = 'all' | DisplayStatus
const TABS: [Filter, string][] = [['all', 'All'], ['pending', 'Pending'], ['accepted', 'Accepted'], ['declined', 'Declined'], ['expired', 'Expired']]

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

  return null // ← ported JSX per the list above
}
```

- [ ] **Step 4: Verify manually**

With invites from Tasks 6–7: stat counts correct; chips filter; Details on the declined one shows "Declined, kindly" + time and no "first try" text; Copy link copies `http://localhost:3000/i/…`; a new account shows the empty state.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: sender dashboard with live invitation status"
```

---

### Task 9: End-to-end tests

**Files:**
- Create: `playwright.config.ts`, `e2e/valentine.spec.ts`

- [ ] **Step 1: `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test'

try { process.loadEnvFile('.env.local') } catch {}

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  use: { baseURL: process.env.BASE_URL ?? 'http://localhost:3000', trace: 'retain-on-failure' },
  projects: [{ name: 'mobile', use: { ...devices['Pixel 7'] } }],
})
```

- [ ] **Step 2: `e2e/valentine.spec.ts`**

```ts
import { expect, test, type Page } from '@playwright/test'

test.describe.configure({ mode: 'serial' })
const email = `valentine-e2e-${Date.now()}@example.com`

async function createInvite(page: Page, name: string) {
  await page.goto('/create')
  await page.getByLabel('Who is it for?').fill(name)
  await page.getByLabel('Your message').fill('Every coffee run is better with you.')
  await page.getByRole('button', { name: 'Create Invitation' }).click()
  await expect(page.getByText(`Your letter for ${name} is sealed`)).toBeVisible()
  return page.getByLabel('Shareable link').inputValue()
}

test('signed-out visitors are sent to login', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login$/)
  await page.goto('/create')
  await expect(page).toHaveURL(/\/login$/)
})

test('unknown or malformed links show the lost-letter page', async ({ page, request }) => {
  for (const path of ['/i/hello', '/i/aaaaaaaaaaaaaaaaaaaaa']) {
    await page.goto(path)
    await expect(page.getByText('This letter got lost in the mail')).toBeVisible()
  }
  const res = await request.post('/api/invites/aaaaaaaaaaaaaaaaaaaaa/respond', { data: { answer: 'accepted' } })
  expect(res.status()).toBe(404)
})

test('sender creates invites; recipient declines one and accepts another', async ({ page, browser, request }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: 'New here? Create an account' }).click()
  await page.getByLabel('Your name').fill('Sam')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill('valentine-e2e-pass')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByText('No invitations yet')).toBeVisible()
  await page.goto('/login')
  await expect(page).toHaveURL(/\/dashboard$/)

  // Invite 1: two Nos
  const declineLink = await createInvite(page, 'Jules')
  const recipient = await (await browser.newContext()).newPage()
  await recipient.goto(declineLink)
  await recipient.getByRole('button', { name: 'Open your letter' }).click()
  await recipient.getByRole('button', { name: 'No, thank you' }).click()
  await expect(recipient.getByText('Okay! Just double-checking')).toBeVisible()
  await recipient.getByRole('button', { name: 'Yes, I’m sure' }).click()
  await expect(recipient.getByText('Two Nos?')).toBeVisible()
  await recipient.reload()
  await expect(recipient.getByText('Take care, Jules')).toBeVisible()

  // API: bad body 400; repeating the answer is harmless
  const slug = declineLink.split('/i/')[1]
  expect((await request.post(`/api/invites/${slug}/respond`, { data: { answer: 'maybe' } })).status()).toBe(400)
  expect((await request.post(`/api/invites/${slug}/respond`, { data: { answer: 'declined' } })).status()).toBe(200)

  // Invite 2: sender preview must not count, then recipient says Yes
  const acceptLink = await createInvite(page, 'Mika')
  await page.goto(`${acceptLink}?preview=1`)
  await expect(page.getByText('Preview — your answer won’t be sent')).toBeVisible()
  await page.goto('/dashboard')
  await expect(page.locator('.row', { hasText: 'Mika' })).toContainText('Not opened yet')

  await recipient.goto(acceptLink)
  await recipient.getByRole('button', { name: 'Open your letter' }).click()
  await recipient.getByRole('button', { name: /Yes, I’d love to/ }).click()
  await expect(recipient.getByText('Yay! It’s a date!')).toBeVisible()

  await page.reload()
  await expect(page.locator('.row', { hasText: 'Jules' })).toContainText('Declined')
  await expect(page.locator('.row', { hasText: 'Mika' })).toContainText('Accepted')
})

test('anonymous clients cannot read the invites table', async ({ request }) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  test.skip(!url || !key, 'Supabase env not available')
  const res = await request.get(`${url}/rest/v1/invites?select=*`, { headers: { apikey: key! } })
  expect(res.ok()).toBe(true)
  expect(await res.json()).toEqual([])
})
```

- [ ] **Step 3: Run against local dev**

```bash
npx playwright install chromium
npm run dev        # background
npx playwright test
```
Expected: 4 passed. If Supabase rejects `@example.com`, change the domain to `@test.dev` and re-run.

- [ ] **Step 4: Full check**

Run: `npm test && npm run build`
Expected: all pass; build succeeds.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "test: end-to-end flow, redirects and RLS check"
```

---

### Task 10: Deploy (GitHub → Vercel ↔ Supabase) + README

**Files:**
- Modify: `README.md` (replace generated)

- [ ] **Step 1: README.md**

````markdown
# Will You Be My Valentine? 💌

Write a Valentine, share a link, find out the answer — kindly.

**Live:** <production URL>

## Architecture

```
Browser ──► Next.js (App Router) on Vercel
             ├─ Server Components: /dashboard, /create, /i/[slug]
             ├─ Server Actions: sign in/up/out, createInvite     (signed-in sender, under RLS)
             └─ Route Handlers: POST /api/invites/[slug]/open|respond  (anonymous recipient)
                    ▼
          Supabase: Auth (email+password) · Postgres (RLS + security-definer functions) · pg_cron cleanup
```

- **Front-end:** Next.js + Tailwind, ported from the Claude Design canvas (`design/`).
- **Back-end:** Supabase Postgres with Row Level Security. Recipients reach data only through `get_public_invite`, `mark_invite_opened`, `respond_to_invite`. No service-role key in the app.
- **Infra:** GitHub → Vercel (preview per PR, production on `main`); schema in `supabase/migrations`, applied with the Supabase CLI.

## Respect rule
Both buttons are always equal. A second No ends the asking. Senders only see the final answer.

## Run locally
```bash
cp .env.example .env.local   # Supabase URL + anon key
npm install && npm run dev
npm test                     # unit
npx playwright test          # e2e (BASE_URL=… to target a deploy)
```

## Deploy
1. `npx supabase link --project-ref <ref> && npx supabase db push`
2. Import the GitHub repo in Vercel; add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Supabase → Authentication → URL Configuration → Site URL = production URL.
````

- [ ] **Step 2: Push to GitHub** (user creates an empty repo `will-you-be-my-valentine` on github.com)

```bash
git add README.md && git commit -m "docs: README with architecture and deploy steps"
git remote add origin https://github.com/<user>/will-you-be-my-valentine.git
git push -u origin main
```

- [ ] **Step 3: Vercel project** (user runs the login)

```bash
! npx vercel login
npx vercel link --yes
npx vercel git connect
printf '%s' "$NEXT_PUBLIC_SUPABASE_URL" | npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
printf '%s' "$NEXT_PUBLIC_SUPABASE_ANON_KEY" | npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# repeat both for preview
npx vercel --prod
```
Expected: a production URL.

- [ ] **Step 4: Supabase Auth URL** — Authentication → URL Configuration → Site URL = production URL.

- [ ] **Step 5: E2E against production**

Run: `BASE_URL=https://<production-domain> npx playwright test`
Expected: 4 passed.

- [ ] **Step 6: Live URL in README, push**

```bash
git add README.md && git commit -m "docs: add live URL" && git push
```
Expected: Vercel auto-builds the push (Git → deploy pipeline proven).
