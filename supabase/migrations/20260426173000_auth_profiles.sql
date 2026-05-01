create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  business_name text not null default 'My Business',
  full_name text not null default 'New User',
  email text not null,
  phone text,
  address text,
  logo_url text,
  default_currency text not null default '$',
  default_hourly_rate numeric(10,2) not null default 0,
  default_billing_increment text not null default 'exact',
  default_minimum_billable_minutes integer,
  default_invoice_detail_level text not null default 'standard',
  default_invoice_notes text,
  invoice_number_prefix text not null default 'INV',
  next_invoice_number integer not null default 1,
  default_due_days integer not null default 14,
  tax_label text,
  tax_percentage numeric(5,2),
  payment_instructions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_default_billing_increment_check check (
    default_billing_increment in (
      'exact',
      'round_up_5',
      'round_up_10',
      'round_up_15',
      'round_up_30',
      'round_up_60',
      'min_15',
      'min_30'
    )
  ),
  constraint profiles_default_invoice_detail_level_check check (
    default_invoice_detail_level in ('simple', 'standard', 'audit')
  ),
  constraint profiles_default_hourly_rate_check check (default_hourly_rate >= 0),
  constraint profiles_default_minimum_billable_minutes_check check (
    default_minimum_billable_minutes is null or default_minimum_billable_minutes >= 0
  ),
  constraint profiles_next_invoice_number_check check (next_invoice_number >= 1),
  constraint profiles_default_due_days_check check (default_due_days between 1 and 365),
  constraint profiles_tax_percentage_check check (
    tax_percentage is null or (tax_percentage >= 0 and tax_percentage <= 100)
  )
);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = user_id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
with check (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own"
on public.profiles
for delete
using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();
