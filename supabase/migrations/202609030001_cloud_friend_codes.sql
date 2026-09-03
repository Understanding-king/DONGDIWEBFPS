alter table public.profiles
  add column if not exists friend_code text;

update public.profiles
set friend_code = upper(right(replace(id::text, '-', ''), 12))
where friend_code is null or friend_code = '';

alter table public.profiles
  alter column friend_code set not null;

create unique index if not exists profiles_friend_code_key
  on public.profiles (friend_code);

alter table public.friendships
  add column if not exists nickname text
  check (nickname is null or char_length(nickname) between 1 and 16);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, display_name, friend_code)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1), 'Player'), 16),
    upper(right(replace(new.id::text, '-', ''), 12))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.get_my_friends()
returns table (
  id uuid,
  display_name text,
  friend_code text,
  created_at timestamptz
)
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select
    profile.id,
    coalesce(nullif(friendship.nickname, ''), profile.display_name) as display_name,
    profile.friend_code,
    friendship.created_at
  from public.friendships as friendship
  join public.profiles as profile on profile.id = friendship.friend_id
  where friendship.user_id = auth.uid()
  order by coalesce(nullif(friendship.nickname, ''), profile.display_name), friendship.created_at;
$$;

create or replace function public.add_friend_by_code(
  p_friend_code text,
  p_nickname text default null
)
returns table (
  id uuid,
  display_name text,
  friend_code text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  target_profile public.profiles%rowtype;
  normalized_nickname text := nullif(left(trim(coalesce(p_nickname, '')), 16), '');
begin
  if caller_id is null then
    raise exception 'Authentication required.' using errcode = 'P0001';
  end if;

  select profile.*
  into target_profile
  from public.profiles as profile
  where profile.friend_code = upper(trim(coalesce(p_friend_code, '')))
  limit 1;

  if target_profile.id is null then
    raise exception 'Friend code not found.' using errcode = 'P0001';
  end if;
  if target_profile.id = caller_id then
    raise exception 'You cannot add yourself.' using errcode = 'P0001';
  end if;

  insert into public.friendships (user_id, friend_id, nickname)
  values (caller_id, target_profile.id, normalized_nickname)
  on conflict (user_id, friend_id)
  do update set nickname = coalesce(excluded.nickname, public.friendships.nickname);

  insert into public.friendships (user_id, friend_id)
  values (target_profile.id, caller_id)
  on conflict (user_id, friend_id) do nothing;

  return query
  select
    target_profile.id,
    coalesce(normalized_nickname, target_profile.display_name),
    target_profile.friend_code,
    (select friendship.created_at
      from public.friendships as friendship
      where friendship.user_id = caller_id and friendship.friend_id = target_profile.id);
end;
$$;

create or replace function public.remove_friend(p_friend_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception 'Authentication required.' using errcode = 'P0001';
  end if;

  delete from public.friendships
  where (user_id = caller_id and friend_id = p_friend_id)
     or (user_id = p_friend_id and friend_id = caller_id);
end;
$$;

revoke all on function public.get_my_friends() from public;
revoke all on function public.add_friend_by_code(text, text) from public;
revoke all on function public.remove_friend(uuid) from public;

grant execute on function public.get_my_friends() to authenticated;
grant execute on function public.add_friend_by_code(text, text) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
