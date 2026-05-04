create table if not exists public.rate_limit_buckets (
  scope_key text primary key,
  bucket_count integer not null default 0,
  reset_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rate_limit_buckets_count_check check (bucket_count >= 0)
);

create index if not exists rate_limit_buckets_reset_at_idx
  on public.rate_limit_buckets (reset_at);

alter table public.rate_limit_buckets enable row level security;

create or replace function public.consume_rate_limit(
  p_scope_key text,
  p_limit integer,
  p_window_ms integer,
  p_now timestamptz default now()
)
returns table (
  allowed boolean,
  remaining integer,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := coalesce(p_now, now());
  v_reset_at timestamptz;
  v_count integer;
  v_retry_seconds integer;
begin
  if coalesce(trim(p_scope_key), '') = '' then
    raise exception 'RATE_LIMIT_SCOPE_KEY_REQUIRED';
  end if;

  if p_limit is null or p_limit <= 0 then
    raise exception 'RATE_LIMIT_INVALID_LIMIT';
  end if;

  if p_window_ms is null or p_window_ms <= 0 then
    raise exception 'RATE_LIMIT_INVALID_WINDOW';
  end if;

  loop
    -- Active window: increment existing bucket
    update public.rate_limit_buckets
    set bucket_count = bucket_count + 1,
        updated_at = v_now
    where scope_key = p_scope_key
      and reset_at > v_now
    returning bucket_count, reset_at into v_count, v_reset_at;

    if found then
      if v_count <= p_limit then
        return query
        select true, greatest(p_limit - v_count, 0), 0;
      else
        v_retry_seconds := greatest(1, ceil(extract(epoch from (v_reset_at - v_now)))::integer);
        return query
        select false, 0, v_retry_seconds;
      end if;
      return;
    end if;

    -- Expired window: reset existing bucket
    update public.rate_limit_buckets
    set bucket_count = 1,
        reset_at = v_now + make_interval(secs => p_window_ms::double precision / 1000.0),
        updated_at = v_now
    where scope_key = p_scope_key
      and reset_at <= v_now
    returning bucket_count, reset_at into v_count, v_reset_at;

    if found then
      return query
      select true, greatest(p_limit - 1, 0), 0;
      return;
    end if;

    -- New bucket
    begin
      insert into public.rate_limit_buckets (
        scope_key,
        bucket_count,
        reset_at,
        created_at,
        updated_at
      )
      values (
        p_scope_key,
        1,
        v_now + make_interval(secs => p_window_ms::double precision / 1000.0),
        v_now,
        v_now
      );

      return query
      select true, greatest(p_limit - 1, 0), 0;
      return;
    exception
      when unique_violation then
        -- Concurrent writer inserted first; retry the loop.
    end;
  end loop;
end;
$$;

revoke all on table public.rate_limit_buckets from anon;
revoke all on table public.rate_limit_buckets from authenticated;

revoke all on function public.consume_rate_limit(
  text,
  integer,
  integer,
  timestamptz
) from public;

grant execute on function public.consume_rate_limit(
  text,
  integer,
  integer,
  timestamptz
) to anon;

grant execute on function public.consume_rate_limit(
  text,
  integer,
  integer,
  timestamptz
) to authenticated;

grant execute on function public.consume_rate_limit(
  text,
  integer,
  integer,
  timestamptz
) to service_role;
