begin;

create table public.records (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null check (char_length(id) between 1 and 120),
  title text not null default '',
  category text not null default '',
  occurred_on date,
  description text not null default '',
  ai_description text not null default '',
  keywords text[] not null default '{}',
  uncertainties text[] not null default '{}',
  files jsonb not null default '[]'::jsonb,
  photos jsonb not null default '[]'::jsonb,
  needs_date boolean not null default false,
  created_via text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  constraint records_files_array check (jsonb_typeof(files) = 'array'),
  constraint records_photos_array check (jsonb_typeof(photos) = 'array')
);

create table public.notes (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null check (char_length(id) between 1 and 120),
  content text not null check (char_length(btrim(content)) > 0),
  note_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.categories (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create index records_user_occurred_on_idx on public.records (user_id, occurred_on desc);
create index records_user_created_at_idx on public.records (user_id, created_at desc);
create index notes_user_note_date_idx on public.notes (user_id, note_date desc);
create index notes_user_created_at_idx on public.notes (user_id, created_at desc);

create or replace function public.set_archive_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger records_set_updated_at
before update on public.records
for each row execute function public.set_archive_updated_at();

create trigger notes_set_updated_at
before update on public.notes
for each row execute function public.set_archive_updated_at();

alter table public.records enable row level security;
alter table public.notes enable row level security;
alter table public.categories enable row level security;

create policy records_select_own
on public.records for select to authenticated
using ((select auth.uid()) = user_id);

create policy records_insert_own
on public.records for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy records_update_own
on public.records for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy records_delete_own
on public.records for delete to authenticated
using ((select auth.uid()) = user_id);

create policy notes_select_own
on public.notes for select to authenticated
using ((select auth.uid()) = user_id);

create policy notes_insert_own
on public.notes for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy notes_update_own
on public.notes for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy notes_delete_own
on public.notes for delete to authenticated
using ((select auth.uid()) = user_id);

create policy categories_select_own
on public.categories for select to authenticated
using ((select auth.uid()) = user_id);

create policy categories_insert_own
on public.categories for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy categories_update_own
on public.categories for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy categories_delete_own
on public.categories for delete to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.records from anon;
revoke all on table public.notes from anon;
revoke all on table public.categories from anon;

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.records to authenticated;
grant select, insert, update, delete on table public.notes to authenticated;
grant select, insert, update, delete on table public.categories to authenticated;
grant usage, select on sequence public.categories_id_seq to authenticated;

comment on table public.records is 'MyArchive experience records owned by an authenticated user.';
comment on table public.notes is 'MyArchive quick notes owned by an authenticated user.';
comment on column public.records.files is 'Attachment references only; file bytes are outside the phase-one database scope.';
comment on column public.records.photos is 'Photo references only; image bytes are outside the phase-one database scope.';

commit;
