begin;

alter table public.time_entries
  drop constraint if exists time_entries_billable_status_check;

alter table public.time_entries
  drop constraint if exists time_entries_non_billable_category_check;

alter table public.time_entries
  drop constraint if exists time_entries_status_check;

update public.time_entries
set status = case
  when invoice_id is null then 'uninvoiced'
  else 'invoiced'
end
where status = 'non_billable';

update public.time_entries
set status = case
  when invoice_id is null then 'uninvoiced'
  else 'invoiced'
end
where status not in ('uninvoiced', 'invoiced');

alter table public.time_entries
  add constraint time_entries_status_check check (
    status in ('uninvoiced', 'invoiced')
  );

alter table public.time_entries
  drop column if exists non_billable_category;

alter table public.time_entries
  drop column if exists is_billable;

drop index if exists public.time_entries_status_billable_idx;

create index if not exists time_entries_status_invoice_idx
  on public.time_entries(user_id, status, invoice_id);

commit;
