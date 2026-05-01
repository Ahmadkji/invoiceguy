-- Fix: RPC line item amount computation causes TOTAL_MISMATCH (409)
--
-- Root cause: The RPC recomputes line item amounts as billedMinutes/60 * hourlyRate,
-- but the TS server computes amounts using cent-integer quantity*rate arithmetic.
-- The billedMinutes <-> quantity conversion is lossy (integer rounding of qty*60),
-- so the RPC's recomputed amounts can diverge from the server-validated amounts,
-- causing SUBTOTAL_MISMATCH and TOTAL_MISMATCH errors.
--
-- Fix: Trust the server-validated `amount` field from the payload.
-- The TS server already computes amounts precisely via calculateLineAmountCents().
-- Fall back to billedMinutes/60 * hourlyRate only when amount is missing/zero
-- (backward compatibility for any direct RPC callers that don't send amount).

create or replace function public.create_invoice_with_items(
  p_client_id uuid,
  p_invoice_date date,
  p_due_date date,
  p_detail_level text,
  p_status text,
  p_notes text,
  p_payment_instructions text,
  p_subtotal numeric,
  p_tax_amount numeric,
  p_discount_amount numeric,
  p_total_amount numeric,
  p_line_items jsonb,
  p_invoice_number text default null,
  p_idempotency_key text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_invoice_id uuid;
  v_existing_invoice_id uuid;
  v_invoice_number text;
  v_invoice_prefix text;
  v_next_invoice_number integer;
  v_item jsonb;
  v_item_description text;
  v_item_actual_minutes integer;
  v_item_billed_minutes integer;
  v_item_hourly_rate numeric(10,2);
  v_item_amount numeric(12,2);
  v_time_entry_id uuid;
  v_line_amount_sum numeric(12,2) := 0;
  v_sort_order integer := 0;
  v_effective_detail_level text := coalesce(nullif(btrim(p_detail_level), ''), 'standard');
  v_effective_status text := coalesce(nullif(btrim(p_status), ''), 'draft');
  v_effective_idempotency_key text := nullif(btrim(coalesce(p_idempotency_key, '')), '');
  v_effective_invoice_number text := nullif(btrim(coalesce(p_invoice_number, '')), '');
  v_expected_total numeric(12,2);
  -- Snapshot variables
  v_client_name text;
  v_client_email text;
  v_client_company text;
  v_client_address text;
  v_client_phone text;
  v_project_name text;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_line_items is null
    or jsonb_typeof(p_line_items) <> 'array'
    or jsonb_array_length(p_line_items) = 0
  then
    raise exception 'LINE_ITEMS_REQUIRED';
  end if;

  if p_due_date is not null and p_due_date < p_invoice_date then
    raise exception 'INVALID_DUE_DATE';
  end if;

  if v_effective_detail_level not in ('simple', 'standard', 'audit') then
    raise exception 'INVALID_DETAIL_LEVEL';
  end if;

  if v_effective_status not in ('draft', 'sent', 'paid', 'void') then
    raise exception 'INVALID_STATUS';
  end if;

  if p_subtotal < 0 or p_tax_amount < 0 or p_discount_amount < 0 or p_total_amount < 0 then
    raise exception 'INVALID_TOTALS';
  end if;

  v_expected_total := round(greatest(0, p_subtotal + p_tax_amount - p_discount_amount), 2);
  if round(p_total_amount, 2) <> v_expected_total then
    raise exception 'TOTAL_MISMATCH';
  end if;

  -- Fetch client data for snapshot (also validates ownership)
  select c.name, c.email, c.company_name, c.billing_address, c.phone
  into v_client_name, v_client_email, v_client_company, v_client_address, v_client_phone
  from public.clients c
  where c.id = p_client_id
    and c.user_id = v_user_id;

  if not found then
    raise exception 'CLIENT_NOT_FOUND';
  end if;

  if v_effective_idempotency_key is not null then
    select i.id
    into v_existing_invoice_id
    from public.invoices i
    where i.user_id = v_user_id
      and i.idempotency_key = v_effective_idempotency_key
    limit 1;

    if v_existing_invoice_id is not null then
      return v_existing_invoice_id;
    end if;
  end if;

  if v_effective_invoice_number is null then
    insert into public.profiles (
      user_id,
      business_name,
      full_name,
      email,
      invoice_number_prefix,
      next_invoice_number
    )
    values (
      v_user_id,
      'My Business',
      coalesce(nullif(auth.jwt() ->> 'full_name', ''), nullif(auth.jwt() ->> 'name', ''), 'New User'),
      coalesce(nullif(auth.jwt() ->> 'email', ''), 'unknown@example.com'),
      'INV',
      1
    )
    on conflict (user_id) do nothing;

    select p.invoice_number_prefix, p.next_invoice_number
    into v_invoice_prefix, v_next_invoice_number
    from public.profiles p
    where p.user_id = v_user_id
    for update;

    v_invoice_prefix := coalesce(nullif(btrim(v_invoice_prefix), ''), 'INV');
    v_invoice_number := v_invoice_prefix || '-' || lpad(v_next_invoice_number::text, 4, '0');

    update public.profiles p
    set next_invoice_number = v_next_invoice_number + 1
    where p.user_id = v_user_id;
  else
    v_invoice_number := v_effective_invoice_number;
  end if;

  insert into public.invoices (
    user_id,
    client_id,
    invoice_number,
    invoice_date,
    due_date,
    detail_level,
    subtotal,
    tax_amount,
    discount_amount,
    total_amount,
    status,
    notes,
    payment_instructions,
    idempotency_key,
    client_name_snapshot,
    client_email_snapshot,
    client_company_snapshot,
    client_address_snapshot,
    client_phone_snapshot
  )
  values (
    v_user_id,
    p_client_id,
    v_invoice_number,
    p_invoice_date,
    p_due_date,
    v_effective_detail_level,
    round(p_subtotal, 2),
    round(p_tax_amount, 2),
    round(p_discount_amount, 2),
    round(p_total_amount, 2),
    v_effective_status,
    nullif(btrim(coalesce(p_notes, '')), ''),
    nullif(btrim(coalesce(p_payment_instructions, '')), ''),
    v_effective_idempotency_key,
    v_client_name,
    v_client_email,
    v_client_company,
    v_client_address,
    v_client_phone
  )
  returning id into v_invoice_id;

  for v_item in
    select value
    from jsonb_array_elements(p_line_items)
  loop
    v_sort_order := v_sort_order + 1;
    v_item_description := nullif(btrim(coalesce(v_item ->> 'description', '')), '');

    if v_item_description is null then
      raise exception 'LINE_ITEM_DESCRIPTION_REQUIRED';
    end if;

    v_item_actual_minutes := greatest(coalesce(nullif(v_item ->> 'actualMinutes', '')::integer, 0), 0);
    v_item_billed_minutes := greatest(coalesce(nullif(v_item ->> 'billedMinutes', '')::integer, 0), 0);
    v_item_hourly_rate := round(coalesce(nullif(v_item ->> 'hourlyRate', '')::numeric, 0), 2);

    -- Trust the server-validated amount (computed via cent-integer arithmetic in TS).
    -- The billedMinutes <-> quantity conversion is lossy (integer rounding of qty*60),
    -- so recomputing from billedMinutes/60 * hourlyRate can diverge from the actual amount.
    v_item_amount := round(coalesce(nullif(v_item ->> 'amount', '')::numeric, 0), 2);

    -- Safety fallback: if amount is missing or zero but we have billed minutes,
    -- recompute from billedMinutes and hourlyRate (backward compat for direct RPC callers).
    if v_item_amount = 0 and v_item_billed_minutes > 0 then
      v_item_amount := round((v_item_billed_minutes::numeric / 60) * v_item_hourly_rate, 2);
    end if;

    if v_item_hourly_rate < 0 or v_item_amount < 0 then
      raise exception 'INVALID_LINE_ITEM_AMOUNT';
    end if;

    v_time_entry_id := null;
    v_project_name := null;
    if coalesce(v_item ->> 'timeEntryId', '') <> '' then
      v_time_entry_id := (v_item ->> 'timeEntryId')::uuid;

      -- LEFT JOIN so missing projects don't fail the entire query
      select proj.name
      into v_project_name
      from public.time_entries t
      left join public.projects proj on proj.id = t.project_id
      where t.id = v_time_entry_id
        and t.user_id = v_user_id
        and t.client_id = p_client_id
        and (t.invoice_id is null or t.invoice_id = v_invoice_id);

      if not found then
        raise exception 'INVALID_TIME_ENTRY_REFERENCE';
      end if;
    end if;

    insert into public.invoice_items (
      invoice_id,
      time_entry_id,
      description,
      actual_minutes,
      billed_minutes,
      hourly_rate,
      amount,
      sort_order,
      project_name_snapshot
    )
    values (
      v_invoice_id,
      v_time_entry_id,
      v_item_description,
      v_item_actual_minutes,
      v_item_billed_minutes,
      v_item_hourly_rate,
      v_item_amount,
      v_sort_order,
      v_project_name
    );

    v_line_amount_sum := round(v_line_amount_sum + v_item_amount, 2);
  end loop;

  if round(v_line_amount_sum, 2) <> round(p_subtotal, 2) then
    raise exception 'SUBTOTAL_MISMATCH';
  end if;

  update public.time_entries t
  set invoice_id = v_invoice_id,
      status = 'invoiced'
  where t.user_id = v_user_id
    and t.id in (
      select distinct (value ->> 'timeEntryId')::uuid
      from jsonb_array_elements(p_line_items)
      where coalesce(value ->> 'timeEntryId', '') <> ''
    );

  return v_invoice_id;
exception
  when unique_violation then
    if v_effective_idempotency_key is not null then
      select i.id
      into v_existing_invoice_id
      from public.invoices i
      where i.user_id = v_user_id
        and i.idempotency_key = v_effective_idempotency_key
      limit 1;

      if v_existing_invoice_id is not null then
        return v_existing_invoice_id;
      end if;
    end if;

    raise;
end;
$$;

-- Re-apply grants after function replacement
revoke all on function public.create_invoice_with_items(
  uuid,
  date,
  date,
  text,
  text,
  text,
  text,
  numeric,
  numeric,
  numeric,
  numeric,
  jsonb,
  text,
  text
) from public;

grant execute on function public.create_invoice_with_items(
  uuid,
  date,
  date,
  text,
  text,
  text,
  text,
  numeric,
  numeric,
  numeric,
  numeric,
  jsonb,
  text,
  text
) to authenticated;
