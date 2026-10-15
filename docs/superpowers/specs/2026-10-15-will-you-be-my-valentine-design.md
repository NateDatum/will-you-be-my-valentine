# Will You Be My Valentine? — Design Spec

Date: 2026-10-15 · Status: awaiting review

## 1. Goal

A deployed, full-stack web app where a signed-in **sender** writes a Valentine invitation, shares a link, and tracks the reply; the **recipient** opens the link on their phone, reads the letter and answers Yes or No. Built to demonstrate **front-end, back-end and infra integration**: Next.js UI on Vercel, Supabase Auth + Postgres, migrations and deploys from Git.

**Success:** a reviewer can open the production URL, sign up, create an invite, open the share link in another browser, answer it, and see the status change on the dashboard.

**Respect rule (non-negotiable):** the recipient can always decline. Both answer buttons are always visible, equal in size and position. After a second No the app stops asking. The sender only ever sees the **final** answer — never hesitation, No-counts or replays.

## 2. Visual source of truth

Claude Design canvas: https://claude.ai/artifact/CwvPXXo4w38rWN7RJDQM8q

| Artboard | Becomes |
|---|---|
| Sender dashboard | `/dashboard` |
| Create invitation | `/create` |
| Recipient flow (mobile) | `/i/[slug]` |
| Design system | Tailwind theme tokens |

Port the markup, copy, SVGs and animations faithfully, with these deliberate deviations:

1. Remove both "Prototype · sample data" badges and the prototype banner.
2. Decline-once screen: heading becomes "Okay! Just double-checking 💌" (drops 🥹). "Let me reconsider" and "Yes, I'm sure" share the same outline style, so neither is pushed.
3. Dashboard detail "Their response" shows only the final answer + time (e.g. "Said yes — it's a date!" / "Feb 9 at 8:42 PM"). No "on the first try" / "after one are-you-sure" text.
4. "Link expires" shows the real `expires_at`. "Opened" shows the first open time.
5. Avatar initial and "Hi {name}" come from the signed-in profile; avatar becomes a menu with **Sign out**.
6. New screen **`/login`** (not on canvas), built from the same tokens: centered white card on cream, logo, Playfair heading "Sign in to write a Valentine", email + password fields, primary button, toggle link "New here? Create an account" (adds a "Your name" field).

### Tokens (from the Design system board)

Rose `#E85D75` · Rose deep `#C94462` (hover `#B33A56`) · Blush `#FFF0F3` · Cream `#FFF9F2` · Wine `#702D43` · Lavender `#E9DDF8` · Peach `#FFD8C2` · Ink `#352B30` · Muted text `#5E5157` / `#6B5F65` · Border `#F1E3E6` / `#EBD5DA`.
Status pills: Accepted `#E4F0E8/#2E5A43`, Pending `#FFF1DB/#7E5310`, Declined `#F7E7EB/#7A3F52`, Expired `#EFEBED/#5E5358`.
Fonts: Playfair Display (500/600/700, italic 400/500) for display and notes; Inter (400/500/600) for UI, via `next/font/google`. Radii 12/16/24, wine-tinted shadows, 4px spacing grid.
Card themes: **Blush letter**, **Lavender dream**, **Peach garden** (values as in the Create board's `THEMES`).

## 3. Architecture

```
Browser ──► Next.js (App Router) on Vercel
             ├─ Server Components: /dashboard, /create, /i/[slug]   (read)
             ├─ Server Actions: signIn, signUp, signOut, createInvite (write, as signed-in user)
             └─ Route Handlers: POST /api/invites/[slug]/open
                                POST /api/invites/[slug]/respond      (anonymous recipient)
                    │ @supabase/ssr (cookie session) / anon key
                    ▼
          Supabase: Auth (email+password) · Postgres (RLS) · pg_cron
```

- **Stack:** latest stable Next.js from `create-next-app@latest` (App Router, TypeScript), Tailwind CSS v4, `@supabase/ssr` + `@supabase/supabase-js`, `zod`, `nanoid`. Vitest for unit tests, Playwright for e2e.
- **No service-role key in the app.** Signed-in reads/writes go through RLS as the user. Anonymous recipient access goes through three `security definer` Postgres functions that expose only what the recipient needs.
- **Auth:** Supabase email + password, "Confirm email" turned **off**. (Supabase's built-in mailer only delivers to project team members, so magic links would block reviewers. Upgrade path: custom SMTP via Resend, then magic links.) `middleware.ts` (or `proxy.ts`, whichever that Next.js version uses) refreshes the session and redirects signed-out users from `/dashboard` and `/create` to `/login`. `/` redirects to `/dashboard` or `/login`.

## 4. Data model (migration `supabase/migrations/0001_init.sql`)

```sql
create type invite_status as enum ('sent', 'opened', 'accepted', 'declined');
create type invite_theme  as enum ('blush', 'lavender', 'peach');

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  created_at timestamptz not null default now()
);

create table invites (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users on delete cascade default auth.uid(),
  share_slug text not null unique check (char_length(share_slug) = 21),
  recipient_name text not null check (char_length(btrim(recipient_name)) between 1 and 40),
  message text not null default '' check (char_length(message) <= 280),
  date_plan text check (char_length(date_plan) <= 120),
  signed_as text check (char_length(signed_as) <= 40),
  theme invite_theme not null default 'blush',
  status invite_status not null default 'sent',
  opened_at timestamptz,
  responded_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index on invites (sender_id, created_at desc);
```

- `profiles` row created by an `after insert on auth.users` trigger from `raw_user_meta_data->>'display_name'`.
- **RLS on both tables.** `profiles`: user selects/updates own row. `invites`: `select` and `insert` where `sender_id = auth.uid()`; no update/delete policies (status changes only via the functions below).
- **Recipient functions** (`security definer`, `set search_path = ''`, `grant execute to anon, authenticated`):
  - `get_public_invite(slug text)` → `recipient_name, message, date_plan, signed_as, theme, status, expires_at` (no ids, no sender_id). Empty if not found.
  - `mark_invite_opened(slug text)` → sets `opened_at = now()`, `status = 'opened'` only when `status = 'sent'` and not expired.
  - `respond_to_invite(slug text, answer text)` → `answer in ('accepted','declined')`; rejects if expired; sets `status`, `responded_at = now()`. Re-answering is allowed (latest wins).
- **Expiry:** `expires_at` = Feb 15, 23:59 Asia/Manila of the next upcoming Feb 14 at creation time (computed in `createInvite`). "Expired" is derived, not stored: `expires_at < now()` and status in (`sent`, `opened`). Answered invites never show as expired.
- **Cleanup:** `pg_cron` job daily: `delete from invites where expires_at < now() - interval '30 days'`.

## 5. Screens and behavior

### Sender
- **`/login`** — sign in / sign up (see §2.6). Errors inline under the field, in `#A3324E`.
- **`/dashboard`** — Dashboard board with real data: four stat cards (Total sent + "N expired without a reply", Pending, Accepted, Declined), filter chips (All/Pending/Accepted/Declined/Expired with counts), table rows (avatar initial, name, theme, status pill, latest activity, sent date, Copy link, Details), details aside (response, message, plan, sent, theme, expires, share link + copy, "Preview as recipient" → `/i/[slug]?preview=1`). Empty state as designed. Filter + selection are client state; data loaded server-side.
  - Pending = `sent` or `opened`, not expired. Activity text: "Not opened yet" · "Opened {date} · no reply yet" · "Said yes · {date}" · "Declined · {date}" · "Link expired {date}".
- **`/create`** — Create board: form (recipient required, message 280 counter, date plan optional, sign-as optional, theme picker) with live preview. Submit → `createInvite` server action → zod validation → insert with `share_slug = nanoid(21)` → success panel with `${SITE_URL}/i/{slug}`, Copy link, native Share button when `navigator.share` exists, "Preview as {name}", "Back to dashboard", "Write another invitation".

### Recipient — `/i/[slug]` (mobile-first, works on desktop centered at 390px max width)
Server component calls `get_public_invite`. Not found → friendly 404 ("This letter got lost in the mail"). Expired and unanswered → Expired screen. Otherwise a client component runs the flow:

```
envelope ──open──► card ──Yes──► accepted (POST accepted)
                     │
                     No ──► declinedOnce ──reconsider──► card
                                  │                          (a second No from card also ends)
                                  └──"Yes, I'm sure"──► declinedTwice (POST declined) ──► done
```

- The No count lives only in React state; it is **never sent** to the server. Only the final `accepted`/`declined` is posted.
- On mount (not `?preview=1`), POST `/open` once. Link-preview bots don't run JS, so they don't count as opens.
- **Revisit after answering:** `accepted` → accepted screen without confetti burst; `declined` → done screen ("Take care, {name}"). Both show a small text link **"Change my answer"** → back to `card` with a fresh No count.
- `?preview=1` (sender preview) runs the full flow but never calls `/open` or `/respond`; shows a small "Preview — your answer won't be sent" pill.
- Accepted screen: date-plan ticket shows the sender's `date_plan` text as the title (no parsed date badge when absent); "Your answer was sent to {signed_as or 'them'}".
- Respect `prefers-reduced-motion` (already in the board CSS).
- **Metadata:** title "Someone has a question for you 💌", generic OG image (`app/i/[slug]/opengraph-image.tsx`, envelope on blush), `robots: noindex`. Never put names or message in metadata.

### Route handlers
`POST /api/invites/[slug]/open` and `/respond` (`{answer: "accepted"|"declined"}`, zod-validated) call the functions with the anon client. Responses: `200 {status}`, `400` bad body, `404` unknown slug, `410` expired. Recipient UI on failure: keep the screen, show a small retry toast "Couldn't send — tap to try again"; never lose the user's choice.

## 6. Security and privacy

- All user text rendered as text (React escaping), never HTML. Length limits enforced by zod **and** DB checks.
- Slugs are 21-char nanoids (unguessable). Sender data reachable only by RLS as owner.
- Recipient-facing functions return no sender identity beyond `signed_as` (which the sender chose to show).
- Only `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_SITE_URL` in the app env.
- Out of scope (documented risk): rate limiting invite creation. Upgrade: Vercel Firewall rate-limit rule on `/create` and `/api/*`.

## 7. Infra and deploy

1. Project folder `will-you-be-my-valentine/` as its own Git repo → pushed to a new GitHub repo (user creates it on github.com; `gh` is not installed).
2. Supabase project created via **Vercel Marketplace → Supabase** integration (auto-injects env vars into the Vercel project), or created on supabase.com and env vars added with `npx vercel env add`.
3. Migrations applied with `npx supabase link` + `npx supabase db push` (Supabase CLI via npx; no Docker, so no local Supabase).
4. Supabase Auth: Site URL = production URL; "Confirm email" off.
5. Vercel project imported from GitHub → preview deploys on PRs, production on `main`.
6. `README.md`: architecture diagram, env vars, setup steps, live URL, and the respect rule.

## 8. Testing

- **Vitest (unit):** recipient flow reducer (two-No rule, reconsider path, revisit/change-answer, preview never posts); `deriveStatus`/activity-text (expired vs pending vs answered); `expiresAtFor(date)` (Oct → next Feb 15; Feb 20 → following year); zod schemas (limits, required recipient).
- **Playwright (e2e, against a deployed URL via `BASE_URL`):** sign up → create invite → open share link in a fresh context → No → "Yes, I'm sure" → bouquet → dashboard shows **Declined**; second invite → Yes → **Accepted**. Plus an RLS check: anon client `select * from invites` returns 0 rows.

## 9. Out of scope (MVP)

Magic link / Google login, email notifications to the sender, editing or deleting invites, photo uploads, music, multiple recipients per invite, analytics, custom domain, i18n.
