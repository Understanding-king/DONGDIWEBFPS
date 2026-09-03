-- Account roles and the small admin surface used by the MVP.
-- Run this after the three existing migrations.

alter table public.profiles
  add column if not exists role text not null default 'player',
  add column if not exists status text not null default 'active';

alter table public.profiles
  drop constraint if exists profiles_role_check,
  drop constraint if exists profiles_status_check;

alter table public.profiles
  add constraint profiles_role_check check (role in ('player', 'admin', 'owner')),
  add constraint profiles_status_check check (status in ('active', 'suspended'));

create or replace function public.is_account_admin()
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin', 'owner')
      and status = 'active'
  );
$$;

revoke all on function public.is_account_admin() from public;
grant execute on function public.is_account_admin() to authenticated;

create or replace function public.protect_account_controls()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (auth.uid() is not null
     and (old.role is distinct from new.role or old.status is distinct from new.status)
     and not public.is_account_admin() then
    raise exception 'Only an administrator can change account controls.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_account_controls on public.profiles;
create trigger protect_account_controls
  before update on public.profiles
  for each row execute procedure public.protect_account_controls();

drop policy if exists "profiles are readable by administrators" on public.profiles;
create policy "profiles are readable by administrators"
  on public.profiles for select
  using (public.is_account_admin());

create or replace function public.admin_list_profiles()
returns table (
  id uuid,
  display_name text,
  friend_code text,
  credits integer,
  xp integer,
  level integer,
  equipped_primary text,
  role text,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  email text
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
stable
as $$
begin
  if not public.is_account_admin() then
    raise exception 'Administrator role required.' using errcode = '42501';
  end if;

  return query
  select
    profile.id,
    profile.display_name,
    profile.friend_code,
    profile.credits,
    profile.xp,
    profile.level,
    profile.equipped_primary,
    profile.role,
    profile.status,
    profile.created_at,
    profile.updated_at,
    users.email::text
  from public.profiles as profile
  left join auth.users as users on users.id = profile.id
  order by profile.created_at asc;
end;
$$;

create or replace function public.admin_update_profile(
  p_user_id uuid,
  p_role text,
  p_status text,
  p_credits integer
)
returns table (
  id uuid,
  display_name text,
  friend_code text,
  credits integer,
  xp integer,
  level integer,
  equipped_primary text,
  role text,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  email text
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  caller_role text;
  target_role text;
begin
  if not public.is_account_admin() then
    raise exception 'Administrator role required.' using errcode = '42501';
  end if;
  select role into caller_role from public.profiles where id = auth.uid();
  select role into target_role from public.profiles where id = p_user_id;
  if caller_role = 'admin' and (p_role = 'owner' or target_role = 'owner') then
    raise exception 'Only the owner can change owner privileges.' using errcode = '42501';
  end if;
  if p_role not in ('player', 'admin', 'owner') then
    raise exception 'Invalid account role.' using errcode = '22023';
  end if;
  if p_status not in ('active', 'suspended') then
    raise exception 'Invalid account status.' using errcode = '22023';
  end if;
  if p_credits is null or p_credits < 0 or p_credits > 999999 then
    raise exception 'Invalid credit amount.' using errcode = '22023';
  end if;

  update public.profiles
  set role = p_role,
      status = p_status,
      credits = p_credits,
      updated_at = now()
  where profiles.id = p_user_id;

  return query
  select
    profile.id,
    profile.display_name,
    profile.friend_code,
    profile.credits,
    profile.xp,
    profile.level,
    profile.equipped_primary,
    profile.role,
    profile.status,
    profile.created_at,
    profile.updated_at,
    users.email::text
  from public.profiles as profile
  left join auth.users as users on users.id = profile.id
  where profile.id = p_user_id;
end;
$$;

revoke all on function public.admin_list_profiles() from public;
revoke all on function public.admin_update_profile(uuid, text, text, integer) from public;
grant execute on function public.admin_list_profiles() to authenticated;
grant execute on function public.admin_update_profile(uuid, text, text, integer) to authenticated;
