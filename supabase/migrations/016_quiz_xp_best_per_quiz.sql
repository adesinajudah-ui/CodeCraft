npm run dev
npm run dev
begin;

-- Quiz XP is credited as "best attempt per quiz": total XP contribution of a
-- quiz equals the highest xp_earned across that student's completed attempts,
-- never the sum of retakes. The delta award is idempotent — the xp_credited
-- flag plus a per-(user, quiz) advisory lock make duplicate submissions award
-- zero additional XP. Previous attempts are never modified or deleted.

alter table public.quiz_attempts
  add column if not exists xp_credited boolean not null default false;

create or replace function public.award_codecraft_quiz_xp(
  p_attempt_id uuid
)
returns table (attempt_id uuid, xp_delta integer, quiz_best_xp integer)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_id text := public.current_codecraft_user_id();
  attempt_quiz_id uuid;
  attempt_xp integer;
  already_credited boolean;
  previous_best integer;
  xp_delta integer;
  today date := (now() at time zone 'utc')::date;
begin
  if actor_id is null or not public.is_codecraft_user_active() then
    raise exception 'Active sign-in required' using errcode = '42501';
  end if;

  if p_attempt_id is null then
    raise exception 'Quiz attempt id is required';
  end if;

  select a.quiz_id, a.xp_earned, a.xp_credited
  into attempt_quiz_id, attempt_xp, already_credited
  from public.quiz_attempts a
  where a.id = p_attempt_id
    and a.clerk_user_id = actor_id
    and a.status in ('completed', 'timed_out')
  for update of a;

  if attempt_quiz_id is null then
    raise exception 'Completed quiz attempt not found';
  end if;

  -- Serialize XP awards per (user, quiz) so two concurrent finishes of the
  -- same quiz cannot both read the same previous best and double-award.
  perform pg_advisory_xact_lock(hashtext(actor_id || ':quiz_xp:' || attempt_quiz_id::text));

  -- Idempotency: an attempt can move the total at most once. Re-processing
  -- returns the quiz's current best with a zero delta.
  if coalesce(already_credited, false) then
    return query select
      p_attempt_id,
      0::integer,
      coalesce((
        select max(xp_earned)
        from public.quiz_attempts completed
        where completed.clerk_user_id = actor_id
          and completed.quiz_id = attempt_quiz_id
          and completed.status in ('completed', 'timed_out')
      ), 0)::integer;
    return;
  end if;

  select coalesce(max(xp_earned), 0)
  into previous_best
  from public.quiz_attempts completed
  where completed.clerk_user_id = actor_id
    and completed.quiz_id = attempt_quiz_id
    and completed.status in ('completed', 'timed_out')
    and completed.id <> p_attempt_id;

  xp_delta := greatest(0, coalesce(attempt_xp, 0) - coalesce(previous_best, 0));

  update public.quiz_attempts
  set xp_credited = true
  where id = p_attempt_id;

  if xp_delta > 0 then
    insert into public.challenge_progress (
      clerk_user_id,
      xp,
      level,
      completed_challenges,
      current_streak,
      last_activity_date,
      updated_at
    ) values (
      actor_id,
      xp_delta,
      greatest(1, 1 + floor(xp_delta / 500)),
      case when previous_best = 0 then 1 else 0 end,
      0,
      today,
      now()
    )
    on conflict (clerk_user_id) do update set
      xp = public.challenge_progress.xp + excluded.xp,
      level = greatest(1, 1 + floor((public.challenge_progress.xp + excluded.xp) / 500)),
      completed_challenges = public.challenge_progress.completed_challenges
        + case when previous_best = 0 then 1 else 0 end,
      last_activity_date = excluded.last_activity_date,
      updated_at = now();
  end if;

  return query select
    p_attempt_id,
    xp_delta,
    greatest(coalesce(previous_best, 0), coalesce(attempt_xp, 0))::integer;
end;
$$;

revoke all on function public.award_codecraft_quiz_xp(uuid) from public;
grant execute on function public.award_codecraft_quiz_xp(uuid) to anon, authenticated;

commit;
