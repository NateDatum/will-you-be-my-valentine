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
