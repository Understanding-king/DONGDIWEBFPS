create table if not exists public.friendships (
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);

alter table public.friendships enable row level security;

create policy "friendships are readable by their owner"
  on public.friendships for select
  using (auth.uid() = user_id);

create policy "friendships are insertable by their owner"
  on public.friendships for insert
  with check (auth.uid() = user_id);

create policy "friendships are deletable by their owner"
  on public.friendships for delete
  using (auth.uid() = user_id);
