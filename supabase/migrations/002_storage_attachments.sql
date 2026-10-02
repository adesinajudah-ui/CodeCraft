insert into storage.buckets (id, name, public)
values
  ('project-files', 'project-files', true),
  ('project-previews', 'project-previews', true),
  ('post-images', 'post-images', true)
on conflict (id) do update set public = excluded.public;

create table if not exists public.post_attachments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  clerk_user_id text not null,
  bucket text not null,
  name text not null,
  kind text not null,
  url text not null,
  created_at timestamptz not null default now()
);

alter table public.post_attachments enable row level security;

create policy "Post attachments are viewable by signed in users"
on public.post_attachments for select to public using (true);

create policy "Users can create their own post attachments"
on public.post_attachments for insert to public
with check (clerk_user_id = current_setting('request.jwt.claims', true)::jsonb ->> 'sub');

create policy "Users can delete their own post attachments"
on public.post_attachments for delete to public
using (clerk_user_id = current_setting('request.jwt.claims', true)::jsonb ->> 'sub');