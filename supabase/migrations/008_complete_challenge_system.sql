begin;

alter table public.challenges
  add column if not exists slug text,
  add column if not exists category text not null default 'General',
  add column if not exists language text not null default 'javascript',
  add column if not exists xp_reward integer not null default 100,
  add column if not exists examples jsonb not null default '[]'::jsonb,
  add column if not exists requirements jsonb not null default '[]'::jsonb,
  add column if not exists prerequisite_challenge_id uuid references public.challenges(id) on delete set null;

create unique index if not exists challenges_slug_unique_idx on public.challenges (slug) where slug is not null;

alter table public.challenge_private_data
  add column if not exists official_solution text;

create table if not exists public.challenge_test_cases (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  input text not null default '',
  expected_output text not null,
  is_hidden boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (challenge_id, position)
);

alter table public.challenge_submissions
  add column if not exists language text not null default 'javascript',
  add column if not exists passed boolean not null default false,
  add column if not exists score integer not null default 0 check (score between 0 and 100),
  add column if not exists passed_test_cases integer not null default 0,
  add column if not exists total_test_cases integer not null default 0,
  add column if not exists execution_time_ms integer,
  add column if not exists memory_kb integer,
  add column if not exists result_summary jsonb not null default '{}'::jsonb;

alter table public.challenge_submissions drop constraint if exists challenge_submissions_status_check;
alter table public.challenge_submissions add constraint challenge_submissions_status_check
  check (status in ('submitted', 'reviewed', 'passed', 'failed'));

create table if not exists public.challenge_completions (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid references public.challenges(id) on delete set null,
  challenge_title text not null,
  clerk_user_id text not null,
  xp_awarded integer not null check (xp_awarded >= 0),
  score integer not null check (score between 0 and 100),
  completed_at timestamptz not null default now(),
  unique (challenge_id, clerk_user_id)
);

create unique index if not exists challenge_completions_user_challenge_unique_idx
  on public.challenge_completions (clerk_user_id, challenge_id) where challenge_id is not null;

create table if not exists public.challenge_progress (
  clerk_user_id text primary key,
  xp integer not null default 0 check (xp >= 0),
  level integer not null default 1 check (level >= 1),
  completed_challenges integer not null default 0 check (completed_challenges >= 0),
  current_streak integer not null default 0 check (current_streak >= 0),
  last_activity_date date,
  updated_at timestamptz not null default now()
);

create index if not exists challenge_completions_period_idx on public.challenge_completions (completed_at desc);
create index if not exists challenge_submissions_admin_idx on public.challenge_submissions (submitted_at desc);
create index if not exists challenge_progress_xp_idx on public.challenge_progress (xp desc);
create index if not exists challenge_test_cases_order_idx on public.challenge_test_cases (challenge_id, position);

grant select on public.challenges, public.challenge_test_cases to anon, authenticated;
grant select, insert, update, delete on public.challenges, public.challenge_private_data, public.challenge_test_cases to anon, authenticated;

alter table public.challenge_test_cases enable row level security;
alter table public.challenge_completions enable row level security;
alter table public.challenge_progress enable row level security;

drop policy if exists "Public reads visible challenge tests" on public.challenge_test_cases;
drop policy if exists "Admins manage challenge tests" on public.challenge_test_cases;
drop policy if exists "Users read own challenge completions" on public.challenge_completions;
drop policy if exists "Users read own challenge progress" on public.challenge_progress;
drop policy if exists "Admins read all challenge submissions" on public.challenge_submissions;
drop policy if exists "Users read own challenge submissions" on public.challenge_submissions;
drop policy if exists "Active CodeCraft accounts only" on public.challenge_test_cases;
drop policy if exists "Active CodeCraft accounts only" on public.challenge_completions;
drop policy if exists "Active CodeCraft accounts only" on public.challenge_progress;

create policy "Public reads visible challenge tests" on public.challenge_test_cases
for select to public using (
  not is_hidden and exists (select 1 from public.challenges c where c.id = challenge_id and c.published)
);
create policy "Admins manage challenge tests" on public.challenge_test_cases
for all to public using (public.is_codecraft_admin()) with check (public.is_codecraft_admin());

create policy "Users read own challenge completions" on public.challenge_completions
for select to public using (clerk_user_id = public.current_codecraft_user_id() or public.is_codecraft_admin());
create policy "Users read own challenge progress" on public.challenge_progress
for select to public using (clerk_user_id = public.current_codecraft_user_id() or public.is_codecraft_admin());

revoke insert, update, delete on public.challenge_submissions from anon, authenticated;
revoke insert, update, delete on public.challenge_completions from anon, authenticated;
revoke insert, update, delete on public.challenge_progress from anon, authenticated;
grant select on public.challenge_submissions to authenticated;
grant select on public.challenge_completions to authenticated;
grant select on public.challenge_progress to authenticated;

drop policy if exists "Users submit own challenge work" on public.challenge_submissions;
create policy "Admins read all challenge submissions" on public.challenge_submissions
for select to public using (public.is_codecraft_admin());
create policy "Users read own challenge submissions" on public.challenge_submissions
for select to public using (clerk_user_id = public.current_codecraft_user_id());

create or replace function public.record_challenge_evaluation(
  p_clerk_user_id text,
  p_challenge_id uuid,
  p_code text,
  p_language text,
  p_passed boolean,
  p_score integer,
  p_passed_test_cases integer,
  p_total_test_cases integer,
  p_execution_time_ms integer,
  p_memory_kb integer,
  p_result_summary jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  challenge_row public.challenges%rowtype;
  submission_id uuid;
  completion_id uuid;
  awarded_xp integer := 0;
  resulting_xp integer := 0;
  resulting_level integer := 1;
  today date := (now() at time zone 'utc')::date;
  streak_value integer := 1;
begin
  if coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '') <> 'service_role' then
    raise exception 'Trusted evaluator required' using errcode = '42501';
  end if;
  if p_clerk_user_id is null or p_code is null or length(p_code) > 50000 then
    raise exception 'Invalid challenge submission';
  end if;
  if p_score < 0 or p_score > 100 or p_total_test_cases < 0 or p_passed_test_cases < 0 or p_passed_test_cases > p_total_test_cases then
    raise exception 'Invalid evaluation result';
  end if;

  select * into challenge_row from public.challenges
  where id = p_challenge_id and published = true for key share;
  if not found then raise exception 'Challenge unavailable'; end if;
  if challenge_row.prerequisite_challenge_id is not null and not exists (
    select 1 from public.challenge_completions c
    where c.challenge_id = challenge_row.prerequisite_challenge_id and c.clerk_user_id = p_clerk_user_id
  ) then
    raise exception 'Complete the prerequisite challenge before submitting';
  end if;
  if exists (select 1 from public.user_account_status s where s.clerk_user_id = p_clerk_user_id and s.status in ('suspended', 'banned')) then
    raise exception 'Account not active' using errcode = '42501';
  end if;

  insert into public.challenge_submissions (
    challenge_id, clerk_user_id, submitted_code, language, status, passed, score,
    passed_test_cases, total_test_cases, execution_time_ms, memory_kb, result_summary
  ) values (
    p_challenge_id, p_clerk_user_id, p_code, p_language,
    case when p_passed then 'passed' else 'failed' end,
    p_passed, p_score, p_passed_test_cases, p_total_test_cases,
    p_execution_time_ms, p_memory_kb, coalesce(p_result_summary, '{}'::jsonb)
  ) returning id into submission_id;

  if p_passed then
    insert into public.challenge_completions (challenge_id, challenge_title, clerk_user_id, xp_awarded, score)
    values (p_challenge_id, challenge_row.title, p_clerk_user_id, challenge_row.xp_reward, p_score)
    on conflict (clerk_user_id, challenge_id) where challenge_id is not null do nothing
    returning id into completion_id;

    if completion_id is not null then
      awarded_xp := challenge_row.xp_reward;
      insert into public.challenge_progress (clerk_user_id, xp, level, completed_challenges, current_streak, last_activity_date)
      values (p_clerk_user_id, awarded_xp, 1 + floor(awarded_xp / 500.0)::integer, 1, 1, today)
      on conflict (clerk_user_id) do update set
        xp = public.challenge_progress.xp + excluded.xp,
        level = 1 + floor((public.challenge_progress.xp + excluded.xp) / 500.0)::integer,
        completed_challenges = public.challenge_progress.completed_challenges + 1,
        current_streak = case
          when public.challenge_progress.last_activity_date = today then public.challenge_progress.current_streak
          when public.challenge_progress.last_activity_date = today - 1 then public.challenge_progress.current_streak + 1
          else 1
        end,
        last_activity_date = today,
        updated_at = now()
      returning xp, level, current_streak into resulting_xp, resulting_level, streak_value;
    else
      select xp, level, current_streak into resulting_xp, resulting_level, streak_value
      from public.challenge_progress where clerk_user_id = p_clerk_user_id;
    end if;
  else
    select xp, level, current_streak into resulting_xp, resulting_level, streak_value
    from public.challenge_progress where clerk_user_id = p_clerk_user_id;
  end if;

  return jsonb_build_object(
    'submission_id', submission_id,
    'passed', p_passed,
    'score', p_score,
    'passed_test_cases', p_passed_test_cases,
    'total_test_cases', p_total_test_cases,
    'xp_awarded', awarded_xp,
    'xp_total', coalesce(resulting_xp, 0),
    'level', coalesce(resulting_level, 1),
    'current_streak', coalesce(streak_value, 0),
    'execution_time_ms', p_execution_time_ms,
    'memory_kb', p_memory_kb
  );
end;
$$;

create or replace function public.get_codecraft_challenge_leaderboard(p_period text default 'all_time')
returns table (rank bigint, username text, xp bigint, is_current_user boolean)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with totals as (
    select c.clerk_user_id,
      sum(c.xp_awarded)::bigint as period_xp
    from public.challenge_completions c
    where case p_period
      when 'weekly' then c.completed_at >= now() - interval '7 days'
      when 'monthly' then c.completed_at >= now() - interval '30 days'
      else true
    end
      and not exists (
        select 1 from public.user_account_status s
        where s.clerk_user_id = c.clerk_user_id and s.status in ('suspended', 'banned')
      )
    group by c.clerk_user_id
  ), ranked as (
    select t.clerk_user_id, t.period_xp,
      row_number() over (order by t.period_xp desc, t.clerk_user_id) as position
    from totals t
  )
  select r.position, coalesce(p.username, 'CodeCraft learner'), r.period_xp,
    r.clerk_user_id = public.current_codecraft_user_id()
  from ranked r
  left join public.profiles p on p.clerk_user_id = r.clerk_user_id
  order by r.position
  limit 100
$$;

create or replace function public.get_codecraft_challenge_solution(p_challenge_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_id text := public.current_codecraft_user_id();
  solution text;
begin
  if actor_id is null or not public.is_codecraft_user_active() then
    raise exception 'Active sign-in required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.challenge_completions c
    where c.challenge_id = p_challenge_id and c.clerk_user_id = actor_id
  ) and not public.is_codecraft_admin() then
    raise exception 'Complete this challenge to view its solution' using errcode = '42501';
  end if;
  select expected_solution into solution from public.challenge_private_data where challenge_id = p_challenge_id;
  return solution;
end;
$$;

revoke all on function public.record_challenge_evaluation(text, uuid, text, text, boolean, integer, integer, integer, integer, integer, jsonb) from public, anon, authenticated;
grant execute on function public.record_challenge_evaluation(text, uuid, text, text, boolean, integer, integer, integer, integer, integer, jsonb) to service_role;
revoke all on function public.get_codecraft_challenge_leaderboard(text) from public;
grant execute on function public.get_codecraft_challenge_leaderboard(text) to anon, authenticated;
revoke all on function public.get_codecraft_challenge_solution(uuid) from public;
grant execute on function public.get_codecraft_challenge_solution(uuid) to authenticated;
grant execute on function public.get_codecraft_challenge_solution(uuid) to anon;

-- Extend the account suspension guard to challenge-owned tables created by this migration.
create policy "Active CodeCraft accounts only" on public.challenge_test_cases as restrictive for all to public
using (public.is_codecraft_user_active()) with check (public.is_codecraft_user_active());
create policy "Active CodeCraft accounts only" on public.challenge_completions as restrictive for all to public
using (public.is_codecraft_user_active()) with check (public.is_codecraft_user_active());
create policy "Active CodeCraft accounts only" on public.challenge_progress as restrictive for all to public
using (public.is_codecraft_user_active()) with check (public.is_codecraft_user_active());

commit;
