begin;

create extension if not exists pgcrypto;

alter table public.admin_roles
  add column if not exists created_by text;

alter table public.announcements
  add column if not exists publish_at timestamptz,
  add column if not exists audience text not null default 'all';

create table if not exists public.user_account_status (
  clerk_user_id text primary key,
  status text not null default 'active' check (status in ('active', 'suspended', 'banned')),
  suspended_at timestamptz,
  suspended_by text,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  category text not null default 'General',
  difficulty text not null default 'Beginner',
  icon text not null default 'CC',
  published boolean not null default false,
  position integer not null default 0,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  content text not null default '',
  published boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  difficulty text not null default 'Beginner' check (difficulty in ('Beginner', 'Intermediate', 'Advanced')),
  instructions text not null default '',
  starter_code text not null default '',
  published boolean not null default false,
  position integer not null default 0,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.challenge_private_data (
  challenge_id uuid primary key references public.challenges(id) on delete cascade,
  validation_data jsonb not null default '{}'::jsonb,
  expected_solution text,
  updated_at timestamptz not null default now()
);

create table if not exists public.challenge_submissions (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  clerk_user_id text not null,
  submitted_code text not null,
  status text not null default 'submitted' check (status in ('submitted', 'reviewed')),
  submitted_at timestamptz not null default now()
);

create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  published boolean not null default false,
  position integer not null default 0,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  question text not null,
  options jsonb not null default '[]'::jsonb,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quiz_answer_keys (
  question_id uuid primary key references public.quiz_questions(id) on delete cascade,
  correct_answer jsonb not null,
  explanation text not null default ''
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  clerk_user_id text not null,
  answers jsonb not null default '{}'::jsonb,
  score integer not null default 0,
  total_questions integer not null default 0,
  submitted_at timestamptz not null default now()
);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  title text not null,
  certificate_code text not null unique default encode(gen_random_bytes(12), 'hex'),
  issued_at timestamptz not null default now(),
  issued_by text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_clerk_user_id text not null,
  target_type text not null check (target_type in ('post', 'user')),
  post_id uuid references public.posts(id) on delete set null,
  target_clerk_user_id text,
  reason text not null,
  details text not null default '',
  status text not null default 'open' check (status in ('open', 'reviewed', 'resolved', 'dismissed')),
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  check ((target_type = 'post' and (post_id is not null or target_clerk_user_id is not null)) or (target_type = 'user' and target_clerk_user_id is not null))
);

create index if not exists courses_published_position_idx on public.courses (published, position);
create index if not exists lessons_course_position_idx on public.lessons (course_id, position);
create index if not exists challenges_published_position_idx on public.challenges (published, position);
create index if not exists quizzes_published_position_idx on public.quizzes (published, position);
create index if not exists quiz_questions_quiz_position_idx on public.quiz_questions (quiz_id, position);
create index if not exists challenge_submissions_user_idx on public.challenge_submissions (clerk_user_id, submitted_at desc);
create index if not exists quiz_attempts_user_idx on public.quiz_attempts (clerk_user_id, submitted_at desc);
create index if not exists reports_status_created_idx on public.reports (status, created_at desc);
create index if not exists certificates_user_issued_idx on public.certificates (clerk_user_id, issued_at desc);

create or replace function public.current_codecraft_user_id()
returns text
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')
$$;

create or replace function public.is_codecraft_admin(p_clerk_user_id text default public.current_codecraft_user_id())
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select p_clerk_user_id = public.current_codecraft_user_id() and exists (
    select 1 from public.admin_roles ar where ar.clerk_user_id = p_clerk_user_id
  ) and not exists (
    select 1 from public.user_account_status s
    where s.clerk_user_id = p_clerk_user_id and s.status <> 'active'
  )
$$;

create or replace function public.is_codecraft_user_active()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.current_codecraft_user_id() is not null and not exists (
    select 1 from public.user_account_status s
    where s.clerk_user_id = public.current_codecraft_user_id() and s.status <> 'active'
  )
$$;

create or replace function public.get_codecraft_settings()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce(jsonb_object_agg(s.key, s.value), '{}'::jsonb)
  from public.admin_settings s
  where s.key in ('maintenance_mode', 'community_enabled')
$$;

create or replace function public.set_codecraft_admin_role(p_target_clerk_user_id text, p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_id text := public.current_codecraft_user_id();
begin
  if actor_id is null or not public.is_codecraft_user_active() or not public.is_codecraft_admin(actor_id) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_target_clerk_user_id is null or length(trim(p_target_clerk_user_id)) = 0 then
    raise exception 'A Clerk user ID is required';
  end if;
  if not p_enabled and actor_id = p_target_clerk_user_id then
    raise exception 'You cannot remove your own administrator role';
  end if;

  if p_enabled then
    insert into public.admin_roles (clerk_user_id, created_by)
    values (p_target_clerk_user_id, actor_id)
    on conflict (clerk_user_id) do nothing;
  else
    delete from public.admin_roles where clerk_user_id = p_target_clerk_user_id;
  end if;
end;
$$;

create or replace function public.set_codecraft_account_status(p_target_clerk_user_id text, p_status text, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_id text := public.current_codecraft_user_id();
begin
  if actor_id is null or not public.is_codecraft_user_active() or not public.is_codecraft_admin(actor_id) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_target_clerk_user_id is null or p_status not in ('active', 'suspended', 'banned') then
    raise exception 'Invalid account status request';
  end if;
  if actor_id = p_target_clerk_user_id and p_status <> 'active' then
    raise exception 'You cannot suspend or ban your own account';
  end if;

  insert into public.user_account_status (clerk_user_id, status, suspended_at, suspended_by, reason)
  values (
    p_target_clerk_user_id,
    p_status,
    case when p_status = 'active' then null else now() end,
    case when p_status = 'active' then null else actor_id end,
    case when p_status = 'active' then null else p_reason end
  )
  on conflict (clerk_user_id) do update set
    status = excluded.status,
    suspended_at = excluded.suspended_at,
    suspended_by = excluded.suspended_by,
    reason = excluded.reason,
    updated_at = now();
end;
$$;

create or replace function public.submit_codecraft_quiz(p_quiz_id uuid, p_answers jsonb)
returns table (attempt_id uuid, score integer, total_questions integer)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_id text := public.current_codecraft_user_id();
  correct_count integer;
  question_count integer;
  new_attempt_id uuid;
begin
  if actor_id is null or not public.is_codecraft_user_active() then
    raise exception 'Active sign-in required' using errcode = '42501';
  end if;
  if not exists (select 1 from public.quizzes q where q.id = p_quiz_id and q.published) then
    raise exception 'Quiz is not available';
  end if;

  select count(*), count(*) filter (where qak.correct_answer = (p_answers -> qn.id::text))
  into question_count, correct_count
  from public.quiz_questions qn
  join public.quiz_answer_keys qak on qak.question_id = qn.id
  where qn.quiz_id = p_quiz_id;

  insert into public.quiz_attempts (quiz_id, clerk_user_id, answers, score, total_questions)
  values (p_quiz_id, actor_id, coalesce(p_answers, '{}'::jsonb), coalesce(correct_count, 0), coalesce(question_count, 0))
  returning id into new_attempt_id;

  return query select new_attempt_id, coalesce(correct_count, 0), coalesce(question_count, 0);
end;
$$;

revoke all on function public.current_codecraft_user_id() from public;
revoke all on function public.is_codecraft_admin(text) from public;
revoke all on function public.is_codecraft_user_active() from public;
revoke all on function public.get_codecraft_settings() from public;
revoke all on function public.set_codecraft_admin_role(text, boolean) from public;
revoke all on function public.set_codecraft_account_status(text, text, text) from public;
revoke all on function public.submit_codecraft_quiz(uuid, jsonb) from public;
grant execute on function public.current_codecraft_user_id() to anon, authenticated;
grant execute on function public.is_codecraft_admin(text) to anon, authenticated;
grant execute on function public.is_codecraft_user_active() to anon, authenticated;
grant execute on function public.get_codecraft_settings() to anon, authenticated;
grant execute on function public.set_codecraft_admin_role(text, boolean) to authenticated;
grant execute on function public.set_codecraft_admin_role(text, boolean) to anon;
grant execute on function public.set_codecraft_account_status(text, text, text) to authenticated;
grant execute on function public.set_codecraft_account_status(text, text, text) to anon;
grant execute on function public.submit_codecraft_quiz(uuid, jsonb) to authenticated;
grant execute on function public.submit_codecraft_quiz(uuid, jsonb) to anon;

alter table public.admin_roles enable row level security;
alter table public.admin_settings enable row level security;
alter table public.audit_logs enable row level security;
alter table public.announcements enable row level security;
alter table public.user_account_status enable row level security;
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_private_data enable row level security;
alter table public.challenge_submissions enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_answer_keys enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.certificates enable row level security;
alter table public.reports enable row level security;

 drop policy if exists "Authenticated users can read admin roles for authorization checks" on public.admin_roles;
 drop policy if exists "Only current admins can insert admin roles" on public.admin_roles;
 drop policy if exists "Only current admins can delete admin roles" on public.admin_roles;
 drop policy if exists "Admins can read settings" on public.admin_settings;
 drop policy if exists "Admins can update settings" on public.admin_settings;
 drop policy if exists "Admins can insert settings" on public.admin_settings;
 drop policy if exists "Admins can read audit logs" on public.audit_logs;
 drop policy if exists "Admins can insert audit logs" on public.audit_logs;
 drop policy if exists "Admins can manage announcements" on public.announcements;
 drop policy if exists "Admins can read admin roles" on public.admin_roles;
 drop policy if exists "Admins can manage settings" on public.admin_settings;
 drop policy if exists "Admins can manage audit logs" on public.audit_logs;
 drop policy if exists "Admins can read audit logs" on public.audit_logs;
 drop policy if exists "Admins can insert audit logs" on public.audit_logs;
 drop policy if exists "Public reads published announcements" on public.announcements;
 drop policy if exists "Admins manage announcements" on public.announcements;

create policy "Admins can read admin roles" on public.admin_roles for select to public using (public.is_codecraft_admin());
create policy "Admins can manage settings" on public.admin_settings for all to public using (public.is_codecraft_admin()) with check (public.is_codecraft_admin());
create policy "Admins can read audit logs" on public.audit_logs for select to public using (public.is_codecraft_admin());
create policy "Admins can append audit logs" on public.audit_logs for insert to public with check (public.is_codecraft_admin() and actor_clerk_user_id = public.current_codecraft_user_id());
create policy "Public reads published announcements" on public.announcements for select to public using (is_published and (publish_at is null or publish_at <= now()));
create policy "Admins manage announcements" on public.announcements for all to public using (public.is_codecraft_admin()) with check (public.is_codecraft_admin());

create policy "Admins manage account status" on public.user_account_status for all to public using (public.is_codecraft_admin()) with check (public.is_codecraft_admin());
create policy "Public reads published courses" on public.courses for select to public using (published);
create policy "Admins manage courses" on public.courses for all to public using (public.is_codecraft_admin()) with check (public.is_codecraft_admin());
create policy "Public reads published lessons" on public.lessons for select to public using (
  published and exists (select 1 from public.courses c where c.id = course_id and c.published)
);
create policy "Admins manage lessons" on public.lessons for all to public using (public.is_codecraft_admin()) with check (public.is_codecraft_admin());
create policy "Public reads published challenges" on public.challenges for select to public using (published);
create policy "Admins manage challenges" on public.challenges for all to public using (public.is_codecraft_admin()) with check (public.is_codecraft_admin());
create policy "Admins manage challenge private data" on public.challenge_private_data for all to public using (public.is_codecraft_admin()) with check (public.is_codecraft_admin());
create policy "Users read own challenge submissions" on public.challenge_submissions for select to public using (clerk_user_id = public.current_codecraft_user_id() or public.is_codecraft_admin());
create policy "Users submit own challenge work" on public.challenge_submissions for insert to public with check (
  clerk_user_id = public.current_codecraft_user_id()
  and exists (select 1 from public.challenges c where c.id = challenge_id and c.published)
);
create policy "Admins read quiz records" on public.quizzes for select to public using (public.is_codecraft_admin());
create policy "Public reads published quizzes" on public.quizzes for select to public using (published);
create policy "Admins manage quizzes" on public.quizzes for all to public using (public.is_codecraft_admin()) with check (public.is_codecraft_admin());
create policy "Users read questions for published quizzes" on public.quiz_questions for select to public using (
  exists (select 1 from public.quizzes q where q.id = quiz_id and q.published)
);
create policy "Admins manage quiz questions" on public.quiz_questions for all to public using (public.is_codecraft_admin()) with check (public.is_codecraft_admin());
create policy "Admins manage quiz answer keys" on public.quiz_answer_keys for all to public using (public.is_codecraft_admin()) with check (public.is_codecraft_admin());
create policy "Users read own quiz attempts" on public.quiz_attempts for select to public using (clerk_user_id = public.current_codecraft_user_id() or public.is_codecraft_admin());
create policy "Users read own certificates" on public.certificates for select to public using (clerk_user_id = public.current_codecraft_user_id() or public.is_codecraft_admin());
create policy "Admins manage certificates" on public.certificates for all to public using (public.is_codecraft_admin()) with check (public.is_codecraft_admin());
create policy "Users create own reports" on public.reports for insert to public with check (
  reporter_clerk_user_id = public.current_codecraft_user_id()
  and (target_clerk_user_id is null or target_clerk_user_id <> public.current_codecraft_user_id())
);
create policy "Admins manage reports" on public.reports for all to public using (public.is_codecraft_admin()) with check (public.is_codecraft_admin());

drop policy if exists "Admins can delete community posts" on public.posts;
create policy "Admins can delete community posts" on public.posts for delete to public using (public.is_codecraft_admin());
drop policy if exists "Admins can remove community attachments" on storage.objects;
create policy "Admins can remove community attachments" on storage.objects for delete to public using (public.is_codecraft_admin());

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  target_table text;
begin
  foreach target_table in array array['user_account_status', 'courses', 'lessons', 'challenges', 'quizzes', 'quiz_questions'] loop
    execute format('drop trigger if exists %I_updated_at on public.%I', target_table, target_table);
    execute format('create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()', target_table, target_table);
  end loop;
end;
$$;

do $$
declare
  target_table text;
begin
  foreach target_table in array array['profiles', 'projects', 'posts', 'comments', 'post_likes', 'post_attachments', 'project_files', 'admin_roles', 'admin_settings', 'audit_logs', 'announcements', 'user_account_status', 'courses', 'lessons', 'challenges', 'challenge_private_data', 'challenge_submissions', 'quizzes', 'quiz_questions', 'quiz_answer_keys', 'quiz_attempts', 'certificates', 'reports'] loop
    if to_regclass(format('public.%I', target_table)) is not null then
      execute format('drop policy if exists "Active CodeCraft accounts only" on public.%I', target_table);
      execute format('create policy "Active CodeCraft accounts only" on public.%I as restrictive for all to public using (public.is_codecraft_user_active()) with check (public.is_codecraft_user_active())', target_table);
    end if;
  end loop;
end;
$$;

drop policy if exists "Active CodeCraft accounts only" on storage.objects;
create policy "Active CodeCraft accounts only" on storage.objects as restrictive for all to public
using (public.is_codecraft_user_active())
with check (public.is_codecraft_user_active());

insert into public.admin_settings (key, value)
values
  ('maintenance_mode', 'false'::jsonb),
  ('community_enabled', 'true'::jsonb),
  ('feature_flags', '[]'::jsonb)
on conflict (key) do nothing;

commit;
