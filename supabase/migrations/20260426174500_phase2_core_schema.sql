create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  company_name text,
  email text not null,
  phone text,
  billing_address text,
  notes text,
  color text not null default '#10B981',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id),
  name text not null,
  description text,
  hourly_rate numeric(10,2) not null,
  billing_increment text not null,
  minimum_billable_minutes integer,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_hourly_rate_check check (hourly_rate >= 0),
  constraint projects_billing_increment_check check (
    billing_increment in (
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
  constraint projects_minimum_billable_minutes_check check (
    minimum_billable_minutes is null or minimum_billable_minutes >= 0
  ),
  constraint projects_status_check check (
    status in ('active', 'paused', 'completed', 'archived')
  )
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id),
  invoice_number text not null,
  invoice_date date not null,
  due_date date,
  detail_level text not null default 'standard',
  subtotal numeric(12,2) not null default 0,
  tax_amount numeric(12,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  status text not null default 'draft',
  notes text,
  payment_instructions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoices_invoice_number_user_unique unique (user_id, invoice_number),
  constraint invoices_detail_level_check check (
    detail_level in ('simple', 'standard', 'audit')
  ),
  constraint invoices_status_check check (
    status in ('draft', 'sent', 'paid', 'void')
  ),
  constraint invoices_subtotal_check check (subtotal >= 0),
  constraint invoices_tax_amount_check check (tax_amount >= 0),
  constraint invoices_discount_amount_check check (discount_amount >= 0),
  constraint invoices_total_amount_check check (total_amount >= 0),
  constraint invoices_due_date_check check (
    due_date is null or due_date >= invoice_date
  )
);

create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id),
  project_id uuid not null references public.projects(id),
  invoice_id uuid references public.invoices(id) on delete set null,
  entry_date date not null,
  start_time timestamptz,
  end_time timestamptz,
  actual_minutes integer not null,
  billed_minutes integer not null,
  hourly_rate numeric(10,2) not null,
  amount numeric(12,2) not null,
  task_note text not null,
  internal_note text,
  is_billable boolean not null default true,
  non_billable_category text,
  billing_rule_snapshot jsonb not null,
  status text not null default 'uninvoiced',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint time_entries_actual_minutes_check check (actual_minutes >= 0),
  constraint time_entries_billed_minutes_check check (billed_minutes >= 0),
  constraint time_entries_hourly_rate_check check (hourly_rate >= 0),
  constraint time_entries_amount_check check (amount >= 0),
  constraint time_entries_status_check check (
    status in ('uninvoiced', 'invoiced', 'non_billable')
  ),
  constraint time_entries_non_billable_category_check check (
    non_billable_category is null
    or non_billable_category in (
      'admin',
      'client_communication',
      'internal',
      'learning',
      'other'
    )
  ),
  constraint time_entries_time_range_check check (
    start_time is null
    or end_time is null
    or end_time >= start_time
  ),
  constraint time_entries_invoice_status_check check (
    (status = 'invoiced' and invoice_id is not null)
    or (status <> 'invoiced' and invoice_id is null)
  ),
  constraint time_entries_billable_status_check check (
    (is_billable = true and non_billable_category is null and status in ('uninvoiced', 'invoiced'))
    or (is_billable = false and status = 'non_billable')
  )
);

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  time_entry_id uuid references public.time_entries(id) on delete set null,
  description text not null,
  actual_minutes integer not null default 0,
  billed_minutes integer not null default 0,
  hourly_rate numeric(10,2) not null default 0,
  amount numeric(12,2) not null default 0,
  sort_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoice_items_actual_minutes_check check (actual_minutes >= 0),
  constraint invoice_items_billed_minutes_check check (billed_minutes >= 0),
  constraint invoice_items_hourly_rate_check check (hourly_rate >= 0),
  constraint invoice_items_amount_check check (amount >= 0),
  constraint invoice_items_sort_order_check check (sort_order >= 1)
);

drop trigger if exists set_clients_updated_at on public.clients;
create trigger set_clients_updated_at
before update on public.clients
for each row
execute function public.set_updated_at();

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
before update on public.projects
for each row
execute function public.set_updated_at();

drop trigger if exists set_invoices_updated_at on public.invoices;
create trigger set_invoices_updated_at
before update on public.invoices
for each row
execute function public.set_updated_at();

drop trigger if exists set_time_entries_updated_at on public.time_entries;
create trigger set_time_entries_updated_at
before update on public.time_entries
for each row
execute function public.set_updated_at();

drop trigger if exists set_invoice_items_updated_at on public.invoice_items;
create trigger set_invoice_items_updated_at
before update on public.invoice_items
for each row
execute function public.set_updated_at();

create index if not exists clients_user_id_idx on public.clients(user_id);
create index if not exists projects_user_id_idx on public.projects(user_id);
create index if not exists projects_client_id_idx on public.projects(client_id);
create index if not exists invoices_user_id_idx on public.invoices(user_id);
create index if not exists invoices_client_id_idx on public.invoices(client_id);
create index if not exists invoices_status_due_date_idx on public.invoices(user_id, status, due_date);
create index if not exists time_entries_user_id_idx on public.time_entries(user_id);
create index if not exists time_entries_client_id_idx on public.time_entries(client_id);
create index if not exists time_entries_project_id_idx on public.time_entries(project_id);
create index if not exists time_entries_entry_date_idx on public.time_entries(user_id, entry_date desc);
create index if not exists time_entries_status_billable_idx on public.time_entries(user_id, status, is_billable);
create index if not exists time_entries_invoice_id_idx on public.time_entries(invoice_id);
create index if not exists invoice_items_invoice_id_sort_order_idx on public.invoice_items(invoice_id, sort_order);
create index if not exists invoice_items_time_entry_id_idx on public.invoice_items(time_entry_id);

alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.invoices enable row level security;
alter table public.time_entries enable row level security;
alter table public.invoice_items enable row level security;

drop policy if exists "clients_select_own" on public.clients;
create policy "clients_select_own"
on public.clients
for select
using (auth.uid() = user_id);

drop policy if exists "clients_insert_own" on public.clients;
create policy "clients_insert_own"
on public.clients
for insert
with check (auth.uid() = user_id);

drop policy if exists "clients_update_own" on public.clients;
create policy "clients_update_own"
on public.clients
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "clients_delete_own" on public.clients;
create policy "clients_delete_own"
on public.clients
for delete
using (auth.uid() = user_id);

drop policy if exists "projects_select_own" on public.projects;
create policy "projects_select_own"
on public.projects
for select
using (auth.uid() = user_id);

drop policy if exists "projects_insert_own" on public.projects;
create policy "projects_insert_own"
on public.projects
for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.clients c
    where c.id = client_id
      and c.user_id = auth.uid()
  )
);

drop policy if exists "projects_update_own" on public.projects;
create policy "projects_update_own"
on public.projects
for update
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.clients c
    where c.id = client_id
      and c.user_id = auth.uid()
  )
);

drop policy if exists "projects_delete_own" on public.projects;
create policy "projects_delete_own"
on public.projects
for delete
using (auth.uid() = user_id);

drop policy if exists "invoices_select_own" on public.invoices;
create policy "invoices_select_own"
on public.invoices
for select
using (auth.uid() = user_id);

drop policy if exists "invoices_insert_own" on public.invoices;
create policy "invoices_insert_own"
on public.invoices
for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.clients c
    where c.id = client_id
      and c.user_id = auth.uid()
  )
);

drop policy if exists "invoices_update_own" on public.invoices;
create policy "invoices_update_own"
on public.invoices
for update
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.clients c
    where c.id = client_id
      and c.user_id = auth.uid()
  )
);

drop policy if exists "invoices_delete_own" on public.invoices;
create policy "invoices_delete_own"
on public.invoices
for delete
using (auth.uid() = user_id);

drop policy if exists "time_entries_select_own" on public.time_entries;
create policy "time_entries_select_own"
on public.time_entries
for select
using (auth.uid() = user_id);

drop policy if exists "time_entries_insert_own" on public.time_entries;
create policy "time_entries_insert_own"
on public.time_entries
for insert
with check (
  auth.uid() = user_id
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

drop policy if exists "time_entries_update_own" on public.time_entries;
create policy "time_entries_update_own"
on public.time_entries
for update
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
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

drop policy if exists "time_entries_delete_own" on public.time_entries;
create policy "time_entries_delete_own"
on public.time_entries
for delete
using (auth.uid() = user_id);

drop policy if exists "invoice_items_select_own" on public.invoice_items;
create policy "invoice_items_select_own"
on public.invoice_items
for select
using (
  exists (
    select 1
    from public.invoices i
    where i.id = invoice_id
      and i.user_id = auth.uid()
  )
);

drop policy if exists "invoice_items_insert_own" on public.invoice_items;
create policy "invoice_items_insert_own"
on public.invoice_items
for insert
with check (
  exists (
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
    )
  )
);

drop policy if exists "invoice_items_update_own" on public.invoice_items;
create policy "invoice_items_update_own"
on public.invoice_items
for update
using (
  exists (
    select 1
    from public.invoices i
    where i.id = invoice_id
      and i.user_id = auth.uid()
  )
)
with check (
  exists (
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
    )
  )
);

drop policy if exists "invoice_items_delete_own" on public.invoice_items;
create policy "invoice_items_delete_own"
on public.invoice_items
for delete
using (
  exists (
    select 1
    from public.invoices i
    where i.id = invoice_id
      and i.user_id = auth.uid()
  )
);
