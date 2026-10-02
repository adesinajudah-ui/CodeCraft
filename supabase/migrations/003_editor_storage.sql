create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  clerk_user_id text not null,
  name text not null,
  path text not null,
  content text not null default '',
  language text not null default 'HTML',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.project_files enable row level security;

create policy "Project files are viewable by signed in users"
on public.project_files for select to public using (true);

create policy "Users can create their own project files"
on public.project_files for insert to public
with check (clerk_user_id = current_setting('request.jwt.claims', true)::jsonb ->> 'sub');

create policy "Users can update their own project files"
on public.project_files for update to public
using (clerk_user_id = current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
with check (clerk_user_id = current_setting('request.jwt.claims', true)::jsonb ->> 'sub');

create policy "Users can delete their own project files"
on public.project_files for delete to public
using (clerk_user_id = current_setting('request.jwt.claims', true)::jsonb ->> 'sub');

create trigger project_files_updated_at
before update on public.project_files
for each row execute function public.set_updated_at();