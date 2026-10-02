create table if not exists public.admin_roles (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null default 'false'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_clerk_user_id text not null,
  action text not null,
  target_type text not null,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  is_published boolean not null default true,
  created_by_clerk_user_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_roles enable row level security;
alter table public.admin_settings enable row level security;
alter table public.audit_logs enable row level security;
alter table public.announcements enable row level security;

create policy "Authenticated users can read admin roles for authorization checks"
on public.admin_roles for select to public using (true);
create policy "Only current admins can insert admin roles"
on public.admin_roles for insert to public with check (
  exists (
    select 1 from public.admin_roles ar where ar.clerk_user_id = current_setting('request.jwt.claims', true)::jsonb ->> 'sub'
  )
);
create policy "Only current admins can delete admin roles"
on public.admin_roles for delete to public using (
  exists (
    select 1 from public.admin_roles ar where ar.clerk_user_id = current_setting('request.jwt.claims', true)::jsonb ->> 'sub'
  )
);

create policy "Admins can read settings"
on public.admin_settings for select to public using (
  exists (
    select 1 from public.admin_roles ar where ar.clerk_user_id = current_setting('request.jwt.claims', true)::jsonb ->> 'sub'
  )
);
create policy "Admins can update settings"
on public.admin_settings for update to public using (
  exists (
    select 1 from public.admin_roles ar where ar.clerk_user_id = current_setting('request.jwt.claims', true)::jsonb ->> 'sub'
  )
) with check (
  exists (
    select 1 from public.admin_roles ar where ar.clerk_user_id = current_setting('request.jwt.claims', true)::jsonb ->> 'sub'
  )
);
create policy "Admins can insert settings"
on public.admin_settings for insert to public with check (
  exists (
    select 1 from public.admin_roles ar where ar.clerk_user_id = current_setting('request.jwt.claims', true)::jsonb ->> 'sub'
  )
);

create policy "Admins can read audit logs"
on public.audit_logs for select to public using (
  exists (
    select 1 from public.admin_roles ar where ar.clerk_user_id = current_setting('request.jwt.claims', true)::jsonb ->> 'sub'
  )
);
create policy "Admins can insert audit logs"
on public.audit_logs for insert to public with check (
  current_setting('request.jwt.claims', true)::jsonb ->> 'sub' = actor_clerk_user_id and exists (
    select 1 from public.admin_roles ar where ar.clerk_user_id = actor_clerk_user_id
  )
);

create policy "Admins can manage announcements"
on public.announcements for all to public using (
  exists (
    select 1 from public.admin_roles ar where ar.clerk_user_id = current_setting('request.jwt.claims', true)::jsonb ->> 'sub'
  )
) with check (
  exists (
    select 1 from public.admin_roles ar where ar.clerk_user_id = current_setting('request.jwt.claims', true)::jsonb ->> 'sub'
  )
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger admin_settings_updated_at
before update on public.admin_settings
for each row execute function public.set_updated_at();

create trigger announcements_updated_at
before update on public.announcements
for each row execute function public.set_updated_at();
