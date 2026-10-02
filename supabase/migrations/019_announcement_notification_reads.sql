begin;

create table if not exists public.user_notification_reads (
  clerk_user_id text not null,
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (clerk_user_id, announcement_id)
);

create index if not exists user_notification_reads_announcement_idx
  on public.user_notification_reads (announcement_id);

alter table public.user_notification_reads enable row level security;

drop policy if exists "Users read their own announcement read state" on public.user_notification_reads;
drop policy if exists "Users add their own announcement read state" on public.user_notification_reads;

create policy "Users read their own announcement read state"
  on public.user_notification_reads
  for select to public
  using (clerk_user_id = public.current_codecraft_user_id());

create policy "Users add their own announcement read state"
  on public.user_notification_reads
  for insert to public
  with check (clerk_user_id = public.current_codecraft_user_id());

grant select, insert on public.user_notification_reads to anon, authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'announcements'
    ) then
      execute 'alter publication supabase_realtime add table public.announcements';
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'user_notification_reads'
    ) then
      execute 'alter publication supabase_realtime add table public.user_notification_reads';
    end if;
  end if;
end;
$$;

commit;
