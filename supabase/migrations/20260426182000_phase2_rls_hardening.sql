-- Phase 2 RLS hardening:
-- 1) Scope all data policies to authenticated users only.
-- 2) Make auth checks explicit.
-- 3) Tighten invoice_items -> time_entries linkage.
-- 4) Harden SECURITY DEFINER function search_path and EXECUTE grants.

-- profiles
alter policy "profiles_select_own"
on public.profiles
to authenticated
using (auth.uid() is not null and auth.uid() = user_id);

alter policy "profiles_insert_own"
on public.profiles
to authenticated
with check (auth.uid() is not null and auth.uid() = user_id);

alter policy "profiles_update_own"
on public.profiles
to authenticated
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

alter policy "profiles_delete_own"
on public.profiles
to authenticated
using (auth.uid() is not null and auth.uid() = user_id);

-- clients
alter policy "clients_select_own"
on public.clients
to authenticated
using (auth.uid() is not null and auth.uid() = user_id);

alter policy "clients_insert_own"
on public.clients
to authenticated
with check (auth.uid() is not null and auth.uid() = user_id);

alter policy "clients_update_own"
on public.clients
to authenticated
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

alter policy "clients_delete_own"
on public.clients
to authenticated
using (auth.uid() is not null and auth.uid() = user_id);

-- projects
alter policy "projects_select_own"
on public.projects
to authenticated
using (auth.uid() is not null and auth.uid() = user_id);

alter policy "projects_insert_own"
on public.projects
to authenticated
with check (
  auth.uid() is not null
  and auth.uid() = user_id
  and exists (
    select 1
    from public.clients c
    where c.id = client_id
      and c.user_id = auth.uid()
  )
);

alter policy "projects_update_own"
on public.projects
to authenticated
using (auth.uid() is not null and auth.uid() = user_id)
with check (
  auth.uid() is not null
  and auth.uid() = user_id
  and exists (
    select 1
    from public.clients c
    where c.id = client_id
      and c.user_id = auth.uid()
  )
);

alter policy "projects_delete_own"
on public.projects
to authenticated
using (auth.uid() is not null and auth.uid() = user_id);

-- invoices
alter policy "invoices_select_own"
on public.invoices
to authenticated
using (auth.uid() is not null and auth.uid() = user_id);

alter policy "invoices_insert_own"
on public.invoices
to authenticated
with check (
  auth.uid() is not null
  and auth.uid() = user_id
  and exists (
    select 1
    from public.clients c
    where c.id = client_id
      and c.user_id = auth.uid()
  )
);

alter policy "invoices_update_own"
on public.invoices
to authenticated
using (auth.uid() is not null and auth.uid() = user_id)
with check (
  auth.uid() is not null
  and auth.uid() = user_id
  and exists (
    select 1
    from public.clients c
    where c.id = client_id
      and c.user_id = auth.uid()
  )
);

alter policy "invoices_delete_own"
on public.invoices
to authenticated
using (auth.uid() is not null and auth.uid() = user_id);

-- time_entries
alter policy "time_entries_select_own"
on public.time_entries
to authenticated
using (auth.uid() is not null and auth.uid() = user_id);

alter policy "time_entries_insert_own"
on public.time_entries
to authenticated
with check (
  auth.uid() is not null
  and auth.uid() = user_id
  and exists (
    select 1
    from public.clients c
    where c.id = client_id
      and c.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.projects p
    where p.id = project_id
      and p.user_id = auth.uid()
      and p.client_id = client_id
  )
  and (
    invoice_id is null
    or exists (
      select 1
      from public.invoices i
      where i.id = invoice_id
        and i.user_id = auth.uid()
    )
  )
);

alter policy "time_entries_update_own"
on public.time_entries
to authenticated
using (auth.uid() is not null and auth.uid() = user_id)
with check (
  auth.uid() is not null
  and auth.uid() = user_id
  and exists (
    select 1
    from public.clients c
    where c.id = client_id
      and c.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.projects p
    where p.id = project_id
      and p.user_id = auth.uid()
      and p.client_id = client_id
  )
  and (
    invoice_id is null
    or exists (
      select 1
      from public.invoices i
      where i.id = invoice_id
        and i.user_id = auth.uid()
    )
  )
);

alter policy "time_entries_delete_own"
on public.time_entries
to authenticated
using (auth.uid() is not null and auth.uid() = user_id);

-- invoice_items
alter policy "invoice_items_select_own"
on public.invoice_items
to authenticated
using (
  auth.uid() is not null
  and exists (
    select 1
    from public.invoices i
    where i.id = invoice_id
      and i.user_id = auth.uid()
  )
);

alter policy "invoice_items_insert_own"
on public.invoice_items
to authenticated
with check (
  auth.uid() is not null
  and exists (
    select 1
    from public.invoices i
    where i.id = invoice_id
      and i.user_id = auth.uid()
  )
  and (
    time_entry_id is null
    or exists (
      select 1
      from public.time_entries t
      where t.id = time_entry_id
        and t.user_id = auth.uid()
        and (t.invoice_id is null or t.invoice_id = invoice_id)
    )
  )
);

alter policy "invoice_items_update_own"
on public.invoice_items
to authenticated
using (
  auth.uid() is not null
  and exists (
    select 1
    from public.invoices i
    where i.id = invoice_id
      and i.user_id = auth.uid()
  )
)
with check (
  auth.uid() is not null
  and exists (
    select 1
    from public.invoices i
    where i.id = invoice_id
      and i.user_id = auth.uid()
  )
  and (
    time_entry_id is null
    or exists (
      select 1
      from public.time_entries t
      where t.id = time_entry_id
        and t.user_id = auth.uid()
        and (t.invoice_id is null or t.invoice_id = invoice_id)
    )
  )
);

alter policy "invoice_items_delete_own"
on public.invoice_items
to authenticated
using (
  auth.uid() is not null
  and exists (
    select 1
    from public.invoices i
    where i.id = invoice_id
      and i.user_id = auth.uid()
  )
);

-- Harden trigger function: locked search_path + qualified refs.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  raw_full_name text;
begin
  raw_full_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (user_id, full_name, email)
  values (new.id, raw_full_name, new.email)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- Restrict direct EXECUTE on the SECURITY DEFINER trigger function.
do $$
begin
  revoke execute on function public.handle_new_user() from public;

  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function public.handle_new_user() to service_role';
  end if;

  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    execute 'grant execute on function public.handle_new_user() to supabase_auth_admin';
  end if;
end
$$;
