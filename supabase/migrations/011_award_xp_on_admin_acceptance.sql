begin;

create or replace function public.review_codecraft_challenge_submission(
  p_submission_id uuid,
  p_decision text,
  p_score integer
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_id text := public.current_codecraft_user_id();
  submission_row public.challenge_submissions%rowtype;
  challenge_row public.challenges%rowtype;
  completion_id uuid;
  awarded_xp integer := 0;
  today date := (now() at time zone 'utc')::date;
begin
  if actor_id is null or not public.is_codecraft_user_active() or not public.is_codecraft_admin(actor_id) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  if p_decision not in ('accepted', 'declined') then
    raise exception 'Decision must be accepted or declined';
  end if;

  if p_score is null or p_score < 0 or p_score > 100 then
    raise exception 'Score must be between 0 and 100';
  end if;

  select * into submission_row
  from public.challenge_submissions
  where id = p_submission_id
  for update;
  if not found then
    raise exception 'Challenge submission not found';
  end if;
  if submission_row.review_decision <> 'pending' then
    raise exception 'This challenge submission has already been reviewed';
  end if;

  select * into challenge_row
  from public.challenges
  where id = submission_row.challenge_id
  for key share;
  if not found then
    raise exception 'Challenge not found';
  end if;

  update public.challenge_submissions
  set review_decision = p_decision,
      review_score = p_score,
      reviewed_by = actor_id,
      reviewed_at = now()
  where id = p_submission_id;

  if p_decision = 'accepted' then
    insert into public.challenge_completions (
      challenge_id,
      challenge_title,
      clerk_user_id,
      xp_awarded,
      score
    ) values (
      challenge_row.id,
      challenge_row.title,
      submission_row.clerk_user_id,
      challenge_row.xp_reward,
      p_score
    )
    on conflict (clerk_user_id, challenge_id) where challenge_id is not null do nothing
    returning id into completion_id;

    if completion_id is not null then
      awarded_xp := challenge_row.xp_reward;
      insert into public.challenge_progress (
        clerk_user_id,
        xp,
        level,
        completed_challenges,
        current_streak,
        last_activity_date
      ) values (
        submission_row.clerk_user_id,
        awarded_xp,
        1 + floor(awarded_xp / 500.0)::integer,
        1,
        1,
        today
      )
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
        updated_at = now();
    end if;
  end if;
end;
$$;

revoke all on function public.review_codecraft_challenge_submission(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.review_codecraft_challenge_submission(uuid, text, integer) to authenticated;

with inserted_completions as (
  insert into public.challenge_completions (
    challenge_id,
    challenge_title,
    clerk_user_id,
    xp_awarded,
    score,
    completed_at
  )
  select distinct on (submission.clerk_user_id, submission.challenge_id)
    challenge.id,
    challenge.title,
    submission.clerk_user_id,
    challenge.xp_reward,
    coalesce(submission.review_score, submission.score, 0),
    coalesce(submission.reviewed_at, submission.submitted_at)
  from public.challenge_submissions submission
  join public.challenges challenge on challenge.id = submission.challenge_id
  where submission.review_decision = 'accepted'
  order by submission.clerk_user_id, submission.challenge_id,
    submission.reviewed_at desc nulls last, submission.submitted_at desc
  on conflict (clerk_user_id, challenge_id) where challenge_id is not null do nothing
  returning clerk_user_id, xp_awarded
), user_awards as (
  select clerk_user_id, sum(xp_awarded)::integer as xp_awarded,
    count(*)::integer as completed_challenges
  from inserted_completions
  group by clerk_user_id
)
insert into public.challenge_progress (clerk_user_id, xp, level, completed_challenges)
select clerk_user_id, xp_awarded,
  1 + floor(xp_awarded / 500.0)::integer, completed_challenges
from user_awards
on conflict (clerk_user_id) do update set
  xp = public.challenge_progress.xp + excluded.xp,
  level = 1 + floor((public.challenge_progress.xp + excluded.xp) / 500.0)::integer,
  completed_challenges = public.challenge_progress.completed_challenges + excluded.completed_challenges,
  updated_at = now();

commit;
