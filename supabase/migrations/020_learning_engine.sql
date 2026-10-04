begin;

-- ============================================================
-- CodeCraft learning engine (interactive, client-authored courses)
-- ============================================================
-- Progress for engine courses (HTML Fundamentals, …) lives in its own table
-- because those lessons are authored in the frontend, not in public.lessons.
-- localStorage remains the always-available layer; this table gives signed-in
-- learners cross-device sync.

create table if not exists public.learning_progress (
  clerk_user_id text not null,
  -- scope is either a course id or '__global__' (points / badges / streak)
  scope text not null,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (clerk_user_id, scope)
);

create index if not exists learning_progress_user_idx
  on public.learning_progress (clerk_user_id, updated_at desc);

alter table public.learning_progress enable row level security;

drop policy if exists "Users read own learning progress" on public.learning_progress;
drop policy if exists "Users write own learning progress" on public.learning_progress;
drop policy if exists "Users update own learning progress" on public.learning_progress;

create policy "Users read own learning progress"
on public.learning_progress for select to public
using (
  clerk_user_id = public.current_codecraft_user_id()
  or public.is_codecraft_admin()
);

create policy "Users write own learning progress"
on public.learning_progress for insert to public
with check (
  clerk_user_id = public.current_codecraft_user_id()
  and public.is_codecraft_user_active()
);

create policy "Users update own learning progress"
on public.learning_progress for update to public
using (clerk_user_id = public.current_codecraft_user_id())
with check (
  clerk_user_id = public.current_codecraft_user_id()
  and public.is_codecraft_user_active()
);

revoke delete on public.learning_progress from anon, authenticated;
grant select, insert, update on public.learning_progress to authenticated;

-- ------------------------------------------------------------
-- Engine course registry: server-side lesson totals used when validating
-- course completion before a certificate is issued.
-- ------------------------------------------------------------

create table if not exists public.engine_courses (
  course_id text primary key,
  title text not null,
  total_lessons integer not null default 0,
  created_at timestamptz not null default now()
);

insert into public.engine_courses (course_id, title, total_lessons)
values ('html-fundamentals', 'HTML Fundamentals', 40)
on conflict (course_id) do nothing;

alter table public.engine_courses enable row level security;

drop policy if exists "Authenticated reads engine courses" on public.engine_courses;
create policy "Authenticated reads engine courses"
on public.engine_courses for select to public
using (public.is_codecraft_user_active());

grant select on public.engine_courses to authenticated;

-- ------------------------------------------------------------
-- Award learning points to the shared XP ledger.
-- Clients cannot write challenge_progress directly; the amount is validated
-- server-side and the level is recalculated on every award.
-- ------------------------------------------------------------

create or replace function public.award_codecraft_learning_points(
  p_points integer,
  p_reason text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id text := public.current_codecraft_user_id();
  resulting_xp integer;
begin
  if actor_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_codecraft_user_active() then
    raise exception 'Account is not active';
  end if;

  if p_points is null or p_points < 1 or p_points > 500 then
    raise exception 'Invalid point amount';
  end if;

  insert into public.challenge_progress (clerk_user_id, xp, level, updated_at)
  values (actor_id, p_points, greatest(1, 1 + floor(p_points / 500.0)::integer), now())
  on conflict (clerk_user_id) do update set
    xp = public.challenge_progress.xp + excluded.xp,
    level = greatest(1, 1 + floor((public.challenge_progress.xp + excluded.xp) / 500.0)::integer),
    updated_at = now()
  returning xp into resulting_xp;

  return jsonb_build_object(
    'awarded', p_points,
    'xp', coalesce(resulting_xp, 0),
    'reason', coalesce(p_reason, '')
  );
end;
$$;

revoke all on function public.award_codecraft_learning_points(integer, text) from public, anon, authenticated;
grant execute on function public.award_codecraft_learning_points(integer, text) to authenticated;

-- ------------------------------------------------------------
-- Issue a certificate for a completed engine course.
-- The existing `certificates` table stays the single source of truth for the
-- Certificates page; users may only ask for a certificate once their stored
-- progress shows every lesson completed.
-- ------------------------------------------------------------

create or replace function public.issue_codecraft_learning_certificate(
  p_course_id text,
  p_course_title text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id text := public.current_codecraft_user_id();
  expected_total integer := 0;
  completed_count integer := 0;
  resolved_title text := null;
  certificate_row public.certificates%rowtype;
begin
  if actor_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_codecraft_user_active() then
    raise exception 'Account is not active';
  end if;

  select c.total_lessons, c.title
    into expected_total, resolved_title
  from public.engine_courses c
  where c.course_id = p_course_id;

  if expected_total is null or expected_total < 1 then
    raise exception 'Unknown course';
  end if;

  select coalesce(
    (
      select count(*)
      from public.learning_progress s,
           jsonb_object_elements(coalesce(s.state -> 'lessons', '{}'::jsonb)) as lesson_row
      where s.clerk_user_id = actor_id
        and s.scope = p_course_id
        and (lesson_row.value ->> 'completed_at') is not null
    ),
    0
  ) into completed_count;

  if completed_count < expected_total then
    raise exception 'Course is not complete yet (% of % lessons completed)', completed_count, expected_total;
  end if;

  select *
    into certificate_row
  from public.certificates
  where clerk_user_id = actor_id
    and title = coalesce(nullif(resolved_title, ''), nullif(p_course_title, ''), p_course_id)
  limit 1;

  if found then
    return jsonb_build_object(
      'issued', false,
      'title', certificate_row.title,
      'certificate_code', certificate_row.certificate_code
    );
  end if;

  insert into public.certificates (clerk_user_id, title, issued_by, metadata)
  values (
    actor_id,
    coalesce(nullif(resolved_title, ''), nullif(p_course_title, ''), p_course_id),
    'CodeCraft',
    jsonb_build_object(
      'source', 'learning_engine',
      'course_id', p_course_id,
      'completed_lessons', completed_count,
      'total_lessons', expected_total
    )
  )
  returning * into certificate_row;

  return jsonb_build_object(
    'issued', true,
    'title', certificate_row.title,
    'certificate_code', certificate_row.certificate_code
  );
end;
$$;

revoke all on function public.issue_codecraft_learning_certificate(text, text) from public, anon, authenticated;
grant execute on function public.issue_codecraft_learning_certificate(text, text) to authenticated;

commit;
