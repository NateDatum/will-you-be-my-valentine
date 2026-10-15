# Will You Be My Valentine? 💌

Write a Valentine, share a link, find out the answer — kindly.

**Live:** _added after first production deploy_

## Architecture

```
Browser ──► Next.js 16 (App Router) on Vercel
             ├─ Server Components: /dashboard, /create, /i/[slug]
             ├─ Server Actions: sign in/up/out, createInvite      (signed-in sender, under RLS)
             ├─ Route Handlers: POST /api/invites/[slug]/open|respond   (anonymous recipient)
             └─ proxy.ts: refreshes the Supabase session, guards /dashboard and /create
                    ▼
          Supabase: Auth (email + password) · Postgres (RLS + security-definer functions) · pg_cron cleanup
```

- **Front-end:** Next.js + Tailwind CSS v4, ported from the Claude Design canvas (`design/*.dc.html`).
- **Back-end:** Supabase Postgres with Row Level Security. Senders can only read and create their own invites. Recipients never log in — they reach an invite only through three `security definer` functions keyed by an unguessable 21-character link id (`get_public_invite`, `mark_invite_opened`, `respond_to_invite`). The app holds no service-role key.
- **Infra:** GitHub → Vercel (preview deploy per pull request, production on `main`). Database schema lives in `supabase/migrations/` and is applied with the Supabase CLI. A daily `pg_cron` job deletes invites 30 days after they expire.

## The respect rule
Both answer buttons are always the same size and always visible. A first "No" gets one playful check-in; a second "No" ends the asking with a virtual bouquet. The No count never leaves the recipient's browser — senders only see the final answer and when it was given.

## Run locally
```bash
cp .env.example .env.local   # Supabase project URL + anon/publishable key
npm install
npm run dev                  # http://localhost:3000
npm test                     # unit tests (Vitest)
npx playwright test          # end-to-end (needs the dev server; BASE_URL=… targets a deploy)
```

## Deploy
1. `npx supabase link --project-ref <ref> && npx supabase db push`
2. Supabase → Authentication → Email: turn **Confirm email** off (built-in mailer only reaches team members).
3. Import the GitHub repo in Vercel and add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
4. Supabase → Authentication → URL Configuration → Site URL = the production URL.

## Docs
- Design spec: `docs/superpowers/specs/2026-10-15-will-you-be-my-valentine-design.md`
- Implementation plan: `docs/superpowers/plans/2026-10-15-will-you-be-my-valentine.md`
