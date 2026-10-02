create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  clerk_user_id text,
  name text not null,
  path text not null,
  content text not null default '',
  language text not null default 'HTML',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects
  add column if not exists title text,
  add column if not exists clerk_user_id text,
  add column if not exists language text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'projects'
      and column_name = 'name'
  ) then
    execute 'update public.projects set title = name where title is null';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'projects'
      and column_name = 'user_id'
  ) then
    execute 'update public.projects set clerk_user_id = user_id::text where clerk_user_id is null';
  end if;
end $$;

alter table public.projects
  alter column title set default 'Untitled project',
  alter column language set default 'HTML';

update public.projects
set title = 'Untitled project'
where title is null;

update public.projects
set language = 'HTML'
where language is null;

alter table public.project_files
  add column if not exists clerk_user_id text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'project_files'
      and column_name = 'user_id'
  ) then
    execute 'update public.project_files set clerk_user_id = user_id::text where clerk_user_id is null';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'project_files'
      and column_name = 'project_id'
  ) then
    update public.project_files file
    set clerk_user_id = project.clerk_user_id
    from public.projects project
    where file.project_id = project.id
      and file.clerk_user_id is null;
  end if;
end $$;

alter table public.project_files enable row level security;

drop policy if exists "Project files are viewable by signed in users" on public.project_files;
create policy "Project files are viewable by signed in users"
on public.project_files for select to public using (true);

drop policy if exists "Users can create their own project files" on public.project_files;
create policy "Users can create their own project files"
on public.project_files for insert to public
with check (clerk_user_id = current_setting('request.jwt.claims', true)::jsonb ->> 'sub');

drop policy if exists "Users can update their own project files" on public.project_files;
create policy "Users can update their own project files"
on public.project_files for update to public
using (clerk_user_id = current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
with check (clerk_user_id = current_setting('request.jwt.claims', true)::jsonb ->> 'sub');

drop policy if exists "Users can delete their own project files" on public.project_files;
create policy "Users can delete their own project files"
on public.project_files for delete to public
using (clerk_user_id = current_setting('request.jwt.claims', true)::jsonb ->> 'sub');

drop trigger if exists project_files_updated_at on public.project_files;
create trigger project_files_updated_at
before update on public.project_files
for each row execute function public.set_updated_at();