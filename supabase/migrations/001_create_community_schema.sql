create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null unique,
  username text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  title text not null,
  description text,
  code text,
  language text,
  file_url text,
  preview_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  post_type text not null check (post_type in ('project', 'question', 'achievement', 'discussion')),
  content text not null default '',
  project_id uuid references public.projects(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  clerk_user_id text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  clerk_user_id text not null,
  created_at timestamptz not null default now(),
  unique (post_id, clerk_user_id)
);

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.post_likes enable row level security;

create policy "Profiles are viewable by signed in users"
on public.profiles for select to public using (true);
create policy "Users can upsert their own profile"
on public.profiles for insert to public with check (clerk_user_id = current_setting('request.jwt.claims', true)::jsonb ->> 'sub');
create policy "Users can update their own profile"
on public.profiles for update to public using (clerk_user_id = current_setting('request.jwt.claims', true)::jsonb ->> 'sub') with check (clerk_user_id = current_setting('request.jwt.claims', true)::jsonb ->> 'sub');

create policy "Projects are viewable by signed in users"
on public.projects for select to public using (true);
create policy "Users can manage their own projects"
on public.projects for insert to public with check (clerk_user_id = current_setting('request.jwt.claims', true)::jsonb ->> 'sub');
create policy "Users can update their own projects"
on public.projects for update to public using (clerk_user_id = current_setting('request.jwt.claims', true)::jsonb ->> 'sub') with check (clerk_user_id = current_setting('request.jwt.claims', true)::jsonb ->> 'sub');
create policy "Users can delete their own projects"
on public.projects for delete to public using (clerk_user_id = current_setting('request.jwt.claims', true)::jsonb ->> 'sub');

create policy "Posts are viewable by signed in users"
on public.posts for select to public using (true);
create policy "Users can create their own posts"
on public.posts for insert to public with check (clerk_user_id = current_setting('request.jwt.claims', true)::jsonb ->> 'sub');
create policy "Users can update their own posts"
on public.posts for update to public using (clerk_user_id = current_setting('request.jwt.claims', true)::jsonb ->> 'sub') with check (clerk_user_id = current_setting('request.jwt.claims', true)::jsonb ->> 'sub');
create policy "Users can delete their own posts"
on public.posts for delete to public using (clerk_user_id = current_setting('request.jwt.claims', true)::jsonb ->> 'sub');

create policy "Comments are viewable by signed in users"
on public.comments for select to public using (true);
create policy "Users can create their own comments"
on public.comments for insert to public with check (clerk_user_id = current_setting('request.jwt.claims', true)::jsonb ->> 'sub');
create policy "Users can update their own comments"
on public.comments for update to public using (clerk_user_id = current_setting('request.jwt.claims', true)::jsonb ->> 'sub') with check (clerk_user_id = current_setting('request.jwt.claims', true)::jsonb ->> 'sub');
create policy "Users can delete their own comments"
on public.comments for delete to public using (clerk_user_id = current_setting('request.jwt.claims', true)::jsonb ->> 'sub');

create policy "Likes are viewable by signed in users"
on public.post_likes for select to public using (true);
create policy "Users can create their own likes"
on public.post_likes for insert to public with check (clerk_user_id = current_setting('request.jwt.claims', true)::jsonb ->> 'sub');
create policy "Users can delete their own likes"
on public.post_likes for delete to public using (clerk_user_id = current_setting('request.jwt.claims', true)::jsonb ->> 'sub');

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

create trigger posts_updated_at
before update on public.posts
for each row execute function public.set_updated_at();

create trigger comments_updated_at
before update on public.comments
for each row execute function public.set_updated_at();

create policy "Storage project-files scoped to clerk user" on storage.objects for select to public using (bucket_id = 'project-files');
create policy "Storage project-previews scoped to clerk user" on storage.objects for select to public using (bucket_id = 'project-previews');
create policy "Storage post-images scoped to clerk user" on storage.objects for select to public using (bucket_id = 'post-images');

create policy "Users can upload to their own project-files" on storage.objects for insert to public with check (bucket_id = 'project-files' and split_part(name, '/', 1) = current_setting('request.jwt.claims', true)::jsonb ->> 'sub');
create policy "Users can upload to their own project-previews" on storage.objects for insert to public with check (bucket_id = 'project-previews' and split_part(name, '/', 1) = current_setting('request.jwt.claims', true)::jsonb ->> 'sub');
create policy "Users can upload to their own post-images" on storage.objects for insert to public with check (bucket_id = 'post-images' and split_part(name, '/', 1) = current_setting('request.jwt.claims', true)::jsonb ->> 'sub');

create policy "Users can delete their own project-files" on storage.objects for delete to public using (bucket_id = 'project-files' and split_part(name, '/', 1) = current_setting('request.jwt.claims', true)::jsonb ->> 'sub');
create policy "Users can delete their own project-previews" on storage.objects for delete to public using (bucket_id = 'project-previews' and split_part(name, '/', 1) = current_setting('request.jwt.claims', true)::jsonb ->> 'sub');
create policy "Users can delete their own post-images" on storage.objects for delete to public using (bucket_id = 'post-images' and split_part(name, '/', 1) = current_setting('request.jwt.claims', true)::jsonb ->> 'sub');

-- Note: this schema expects the Clerk user ID to be mapped into the Supabase JWT subject when used with a custom Clerk->Supabase JWT setup.
-- The frontend still uses the authenticated Clerk user.id as the database key and keeps Clerk as the sole auth system.
