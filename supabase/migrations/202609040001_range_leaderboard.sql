-- Public best-score leaderboard for the six-direction range.
-- The table stays private: clients can only use the two RPC functions below.

create table if not exists public.range_leaderboard (
  user_id uuid not null references public.profiles(id) on delete cascade,
  duration integer not null check (duration in (30, 60, 90)),
  score integer not null check (score >= 0 and score <= 999999),
  hits integer not null check (hits >= 0 and hits <= 10000),
  shots integer not null check (shots >= hits and shots <= 10000),
  average_reaction integer not null check (average_reaction >= 0 and average_reaction <= 60000),
  best_streak integer not null check (best_streak >= 0 and best_streak <= 10000),
  achieved_at timestamptz not null default now(),
  primary key (user_id, duration)
);

create index if not exists range_leaderboard_duration_score_idx
  on public.range_leaderboard (duration, score desc, achieved_at asc);

alter table public.range_leaderboard enable row level security;

create or replace function public.record_range_result(
  p_duration integer,
  p_score integer,
  p_hits integer,
  p_shots integer,
  p_average_reaction integer,
  p_best_streak integer
)
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
  if p_duration not in (30, 60, 90) then
    raise exception 'Invalid range duration.' using errcode = '22023';
  end if;
  if p_score < 0 or p_score > 999999
    or p_hits < 0 or p_hits > 10000
    or p_shots < p_hits or p_shots > 10000
    or p_average_reaction < 0 or p_average_reaction > 60000
    or p_best_streak < 0 or p_best_streak > 10000 then
    raise exception 'Invalid range result.' using errcode = '22023';
  end if;

  insert into public.range_leaderboard (
    user_id, duration, score, hits, shots, average_reaction, best_streak, achieved_at
  ) values (
    caller_id, p_duration, p_score, p_hits, p_shots, p_average_reaction, p_best_streak, now()
  )
  on conflict (user_id, duration) do update
  set score = excluded.score,
      hits = excluded.hits,
      shots = excluded.shots,
      average_reaction = excluded.average_reaction,
      best_streak = excluded.best_streak,
      achieved_at = excluded.achieved_at
  where excluded.score > public.range_leaderboard.score
     or (
       excluded.score = public.range_leaderboard.score
       and (excluded.hits::numeric / nullif(excluded.shots, 0))
         > (public.range_leaderboard.hits::numeric / nullif(public.range_leaderboard.shots, 0))
     )
     or (
       excluded.score = public.range_leaderboard.score
       and excluded.hits = public.range_leaderboard.hits
       and excluded.shots = public.range_leaderboard.shots
       and excluded.average_reaction > 0
       and (
         public.range_leaderboard.average_reaction = 0
         or excluded.average_reaction < public.range_leaderboard.average_reaction
       )
     );
end;
$$;

create or replace function public.get_range_leaderboard(
  p_duration integer default 60,
  p_limit integer default 10
)
returns table (
  rank bigint,
  user_id uuid,
  display_name text,
  duration integer,
  score integer,
  hits integer,
  shots integer,
  average_reaction integer,
  best_streak integer,
  achieved_at timestamptz,
  is_current_player boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
stable
as $$
declare
  requested_limit integer := greatest(1, least(coalesce(p_limit, 10), 10));
  caller_id uuid := auth.uid();
begin
  if p_duration not in (30, 60, 90) then
    raise exception 'Invalid range duration.' using errcode = '22023';
  end if;

  return query
  with ranked as (
    select
      row_number() over (
        order by
          board.score desc,
          (board.hits::numeric / nullif(board.shots, 0)) desc,
          nullif(board.average_reaction, 0) asc nulls last,
          board.achieved_at asc
      ) as placement,
      board.user_id,
      profile.display_name,
      board.duration,
      board.score,
      board.hits,
      board.shots,
      board.average_reaction,
      board.best_streak,
      board.achieved_at
    from public.range_leaderboard as board
    join public.profiles as profile on profile.id = board.user_id
    where board.duration = p_duration
  )
  select
    ranked.placement,
    ranked.user_id,
    ranked.display_name,
    ranked.duration,
    ranked.score,
    ranked.hits,
    ranked.shots,
    ranked.average_reaction,
    ranked.best_streak,
    ranked.achieved_at,
    coalesce(ranked.user_id = caller_id, false)
  from ranked
  where ranked.placement <= requested_limit
     or (caller_id is not null and ranked.user_id = caller_id)
  order by ranked.placement;
end;
$$;

revoke all on table public.range_leaderboard from anon, authenticated;
revoke all on function public.record_range_result(integer, integer, integer, integer, integer, integer) from public;
revoke all on function public.get_range_leaderboard(integer, integer) from public;
grant execute on function public.record_range_result(integer, integer, integer, integer, integer, integer) to authenticated;
grant execute on function public.get_range_leaderboard(integer, integer) to anon, authenticated;
