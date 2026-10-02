begin;

alter table public.challenge_submissions
  add column if not exists review_decision text not null default 'pending',
  add column if not exists review_score integer,
  add column if not exists reviewed_by text,
  add column if not exists reviewed_at timestamptz;

alter table public.challenge_submissions
  drop constraint if exists challenge_submissions_review_decision_check;

alter table public.challenge_submissions
  add constraint challenge_submissions_review_decision_check
  check (review_decision in ('pending', 'accepted', 'declined'));

alter table public.challenge_submissions
  drop constraint if exists challenge_submissions_review_score_check;

alter table public.challenge_submissions
  add constraint challenge_submissions_review_score_check
  check (review_score is null or review_score between 0 and 100);

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

  update public.challenge_submissions
  set review_decision = p_decision,
      review_score = p_score,
      reviewed_by = actor_id,
      reviewed_at = now()
  where id = p_submission_id;

  if not found then
    raise exception 'Challenge submission not found';
  end if;
end;
$$;

revoke all on function public.review_codecraft_challenge_submission(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.review_codecraft_challenge_submission(uuid, text, integer) to authenticated;

commit;
