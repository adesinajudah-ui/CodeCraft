begin;

-- Reposts keep a reference to the original post (never a copy): one row per
-- user per post, with an optional "thought" shown as the reposter's quote.
create table if not exists public.post_reposts (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  clerk_user_id text not null,
  thought text,
  created_at timestamptz not null default now(),
  unique (post_id, clerk_user_id)
);

create index if not exists post_reposts_post_id_idx on public.post_reposts (post_id);
create index if not exists post_reposts_clerk_user_id_idx on public.post_reposts (clerk_user_id);

alter table public.post_reposts enable row level security;

create policy "Reposts are viewable by signed in users"
on public.post_reposts for select to public using (true);

create policy "Users can create their own reposts"
on public.post_reposts for insert to public
with check (clerk_user_id = current_setting('request.jwt.claims', true)::jsonb ->> 'sub');

create policy "Users can delete their own reposts"
on public.post_reposts for delete to public
using (clerk_user_id = current_setting('request.jwt.claims', true)::jsonb ->> 'sub');

-- Realtime for the existing community channel architecture.
do $$
begin
  execute 'alter publication supabase_realtime add table public.post_reposts';
exception
  when duplicate_object then null;
end $$;

commit;
