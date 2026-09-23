-- Section Swap: schema + secure RPC functions
-- Run once in Supabase Dashboard > SQL Editor.

create table if not exists public.swap_requests (
  id               uuid primary key default gen_random_uuid(),
  owner_token      uuid not null default gen_random_uuid(),
  name             text not null check (char_length(name) between 2 and 50),
  phone            text not null check (phone ~ '^01[0-9]{9}$'),
  current_section  int  not null check (current_section between 1 and 40),
  wanted_sections  int[] not null
    check (cardinality(wanted_sections) between 1 and 40),
  created_at       timestamptz not null default now(),
  check (not (current_section = any (wanted_sections)))
);

create index if not exists swap_requests_current_idx
  on public.swap_requests (current_section);

-- No direct table access from the browser: all access goes through the functions below.
alter table public.swap_requests enable row level security;

create or replace function public.create_request(
  p_name text, p_phone text, p_current int, p_wanted int[]
)
returns table (id uuid, owner_token uuid)
language sql security definer set search_path = public as $$
  insert into swap_requests (name, phone, current_section, wanted_sections)
  values (trim(p_name), p_phone, p_current, p_wanted)
  returning swap_requests.id, swap_requests.owner_token;
$$;

-- Mutual match only: they hold what I want, and want what I hold.
-- Phone numbers are returned only to the owner of a request (proved by owner_token).
create or replace function public.my_matches(p_id uuid, p_token uuid)
returns table (name text, phone text, current_section int)
language sql security definer set search_path = public as $$
  select o.name, o.phone, o.current_section
  from swap_requests me
  join swap_requests o
    on o.id <> me.id
   and o.current_section = any (me.wanted_sections)
   and me.current_section = any (o.wanted_sections)
  where me.id = p_id and me.owner_token = p_token
  order by o.created_at;
$$;

create or replace function public.delete_request(p_id uuid, p_token uuid)
returns void
language sql security definer set search_path = public as $$
  delete from swap_requests where id = p_id and owner_token = p_token;
$$;

revoke all on function public.create_request(text, text, int, int[]) from public;
revoke all on function public.my_matches(uuid, uuid) from public;
revoke all on function public.delete_request(uuid, uuid) from public;
grant execute on function public.create_request(text, text, int, int[]) to anon;
grant execute on function public.my_matches(uuid, uuid) to anon;
grant execute on function public.delete_request(uuid, uuid) to anon;
