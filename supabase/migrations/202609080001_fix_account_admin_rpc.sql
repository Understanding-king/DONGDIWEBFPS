-- Fix the account-management RPC for projects that already ran the role migration.
-- The return table contains a column named role, so every profile role reference
-- inside PL/pgSQL must be qualified to avoid "column reference role is ambiguous".

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
    auth_user.email::text
  from public.profiles as profile
  left join auth.users as auth_user on auth_user.id = profile.id
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

  select profile.role
    into caller_role
    from public.profiles as profile
   where profile.id = auth.uid();

  select profile.role
    into target_role
    from public.profiles as profile
   where profile.id = p_user_id;

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

  update public.profiles as profile
     set role = p_role,
         status = p_status,
         credits = p_credits,
         updated_at = now()
   where profile.id = p_user_id;

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
    auth_user.email::text
  from public.profiles as profile
  left join auth.users as auth_user on auth_user.id = profile.id
  where profile.id = p_user_id;
end;
$$;

revoke all on function public.admin_list_profiles() from public;
revoke all on function public.admin_update_profile(uuid, text, text, integer) from public;
grant execute on function public.admin_list_profiles() to authenticated;
grant execute on function public.admin_update_profile(uuid, text, text, integer) to authenticated;
