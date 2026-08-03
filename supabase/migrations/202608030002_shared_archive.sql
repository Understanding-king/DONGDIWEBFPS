begin;

drop policy if exists records_select_own on public.records;
drop policy if exists records_insert_own on public.records;
drop policy if exists records_update_own on public.records;
drop policy if exists records_delete_own on public.records;
drop policy if exists notes_select_own on public.notes;
drop policy if exists notes_insert_own on public.notes;
drop policy if exists notes_update_own on public.notes;
drop policy if exists notes_delete_own on public.notes;
drop policy if exists categories_select_own on public.categories;
drop policy if exists categories_insert_own on public.categories;
drop policy if exists categories_update_own on public.categories;
drop policy if exists categories_delete_own on public.categories;

do $$
begin
  if exists (select 1 from public.records group by id having count(*) > 1) then
    raise exception 'Cannot convert records to shared storage: duplicate ids exist';
  end if;
  if exists (select 1 from public.notes group by id having count(*) > 1) then
    raise exception 'Cannot convert notes to shared storage: duplicate ids exist';
  end if;
  if exists (select 1 from public.categories group by name having count(*) > 1) then
    raise exception 'Cannot convert categories to shared storage: duplicate names exist';
  end if;
end;
$$;

drop index if exists public.records_user_occurred_on_idx;
drop index if exists public.records_user_created_at_idx;
drop index if exists public.notes_user_note_date_idx;
drop index if exists public.notes_user_created_at_idx;

alter table public.records drop constraint if exists records_pkey;
alter table public.records drop constraint if exists records_user_id_fkey;
alter table public.records drop column if exists user_id;
alter table public.records add primary key (id);

alter table public.notes drop constraint if exists notes_pkey;
alter table public.notes drop constraint if exists notes_user_id_fkey;
alter table public.notes drop column if exists user_id;
alter table public.notes add primary key (id);

alter table public.categories drop constraint if exists categories_user_id_name_key;
alter table public.categories drop constraint if exists categories_user_id_fkey;
alter table public.categories drop column if exists user_id;
alter table public.categories add constraint categories_name_key unique (name);

create index records_occurred_on_idx on public.records (occurred_on desc);
create index records_created_at_idx on public.records (created_at desc);
create index notes_note_date_idx on public.notes (note_date desc);
create index notes_created_at_idx on public.notes (created_at desc);

create table public.archive_meta (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.archive_meta enable row level security;

create policy records_shared_access
on public.records for all to anon, authenticated
using (true)
with check (true);

create policy notes_shared_access
on public.notes for all to anon, authenticated
using (true)
with check (true);

create policy categories_shared_access
on public.categories for all to anon, authenticated
using (true)
with check (true);

create policy archive_meta_shared_access
on public.archive_meta for all to anon, authenticated
using (true)
with check (true);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.records to anon, authenticated;
grant select, insert, update, delete on table public.notes to anon, authenticated;
grant select, insert, update, delete on table public.categories to anon, authenticated;
grant select, insert, update, delete on table public.archive_meta to anon, authenticated;
grant usage, select on sequence public.categories_id_seq to anon, authenticated;

comment on table public.archive_meta is 'Singleton shared archive migration state for the no-login MVP.';
comment on table public.records is 'Shared MyArchive experience records. Anyone with the publishable key can read and write.';
comment on table public.notes is 'Shared MyArchive quick notes. Anyone with the publishable key can read and write.';

commit;
