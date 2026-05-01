create table if not exists public.auth_session_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid,
  event text not null,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now(),
  constraint auth_session_events_event_check check (
    event in ('sign_in', 'sign_up', 'sign_out', 'password_update')
  )
);

create index if not exists auth_session_events_user_created_idx
on public.auth_session_events(user_id, created_at desc);

alter table public.auth_session_events enable row level security;

drop policy if exists "auth_session_events_select_own" on public.auth_session_events;
create policy "auth_session_events_select_own"
on public.auth_session_events
for select
to authenticated
using (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists "auth_session_events_insert_own" on public.auth_session_events;
create policy "auth_session_events_insert_own"
on public.auth_session_events
for insert
to authenticated
with check (auth.uid() is not null and auth.uid() = user_id);
