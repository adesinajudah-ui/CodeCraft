begin;

alter table public.quiz_attempts
  add column if not exists current_question_index integer not null default 0;

alter table public.quiz_attempts
  drop constraint if exists quiz_attempts_status_check;

alter table public.quiz_attempts
  add constraint quiz_attempts_status_check
  check (status in ('in_progress', 'completed', 'timed_out'));

create unique index if not exists quiz_attempts_one_active_per_user_quiz
  on public.quiz_attempts (clerk_user_id, quiz_id)
  where status = 'in_progress';

do $$
declare
  duplicate_quiz record;
begin
  for duplicate_quiz in
    select id,
      first_value(id) over (order by created_at, id) as canonical_id,
      row_number() over (order by created_at, id) as record_number
    from public.quizzes
    where title = 'CodeCraft Foundations'
      and description = 'Test your fundamentals in HTML, CSS, and JavaScript with a quick starter quiz.'
      and category = 'General Programming'
      and difficulty = 'Beginner'
      and xp_reward = 250
      and time_limit_seconds = 300
      and feedback_mode = 'end'
      and position = 1
  loop
    if duplicate_quiz.record_number > 1 then
      update public.quiz_attempts
      set quiz_id = duplicate_quiz.canonical_id
      where quiz_id = duplicate_quiz.id;

      delete from public.quizzes where id = duplicate_quiz.id;
    end if;
  end loop;
end;
$$;

drop policy if exists "Users create own quiz drafts" on public.quiz_attempts;
create policy "Users create own quiz drafts"
on public.quiz_attempts for insert to public
with check (
  clerk_user_id = public.current_codecraft_user_id()
  and status = 'in_progress'
  and score = 0
  and xp_earned = 0
);

create or replace function public.save_codecraft_quiz_progress(
  p_attempt_id uuid,
  p_answers jsonb,
  p_current_question_index integer,
  p_time_used integer
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_id text := public.current_codecraft_user_id();
  target_quiz_id uuid;
  question_total integer;
begin
  if actor_id is null or not public.is_codecraft_user_active() then
    raise exception 'Active sign-in required' using errcode = '42501';
  end if;

  select quiz_id into target_quiz_id
  from public.quiz_attempts
  where id = p_attempt_id
    and clerk_user_id = actor_id
    and status = 'in_progress'
  for update;

  if target_quiz_id is null then
    raise exception 'Quiz draft not found';
  end if;

  if not exists (select 1 from public.quizzes where id = target_quiz_id and published) then
    raise exception 'Quiz is not available';
  end if;

  if jsonb_typeof(coalesce(p_answers, '{}'::jsonb)) <> 'object' then
    raise exception 'Quiz answers must be an object';
  end if;

  if exists (
    select 1
    from jsonb_each(coalesce(p_answers, '{}'::jsonb)) answer(question_id, selected_option)
    left join public.quiz_questions q
      on q.id::text = answer.question_id and q.quiz_id = target_quiz_id
    where q.id is null or not (q.options @> jsonb_build_array(answer.selected_option))
  ) then
    raise exception 'Quiz answers contain an invalid option';
  end if;

  select count(*) into question_total
  from public.quiz_questions
  where quiz_id = target_quiz_id;

  if p_current_question_index < 0 or (question_total > 0 and p_current_question_index >= question_total) then
    raise exception 'Question position is invalid';
  end if;

  update public.quiz_attempts
  set answers = coalesce(p_answers, '{}'::jsonb),
      current_question_index = p_current_question_index,
      time_used = greatest(0, coalesce(p_time_used, 0)),
      submitted_at = now()
  where id = p_attempt_id and clerk_user_id = actor_id and status = 'in_progress';
end;
$$;

create or replace function public.evaluate_codecraft_quiz_answer(
  p_quiz_id uuid,
  p_question_id uuid,
  p_answer jsonb
)
returns table (is_correct boolean, explanation text)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_id text := public.current_codecraft_user_id();
  expected_answer jsonb;
  answer_explanation text;
begin
  if actor_id is null or not public.is_codecraft_user_active() then
    raise exception 'Active sign-in required' using errcode = '42501';
  end if;

  select answer_key.correct_answer, answer_key.explanation
  into expected_answer, answer_explanation
  from public.quiz_questions question
  join public.quizzes quiz on quiz.id = question.quiz_id and quiz.published
  join public.quiz_answer_keys answer_key on answer_key.question_id = question.id
  where quiz.id = p_quiz_id
    and question.id = p_question_id
    and quiz.feedback_mode = 'instant'
    and question.options @> jsonb_build_array(p_answer)
    and exists (
      select 1 from public.quiz_attempts attempt
      where attempt.quiz_id = quiz.id
        and attempt.clerk_user_id = actor_id
        and attempt.status = 'in_progress'
    );

  if expected_answer is null then
    raise exception 'Quiz question was not found';
  end if;

  return query select expected_answer = p_answer, coalesce(answer_explanation, '');
end;
$$;

create or replace function public.finish_codecraft_quiz(
  p_attempt_id uuid,
  p_answers jsonb,
  p_time_used integer,
  p_timed_out boolean default false
)
returns table (attempt_id uuid, score integer, total_questions integer, percentage integer, xp_earned integer)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_id text := public.current_codecraft_user_id();
  target_quiz_id uuid;
  quiz_xp integer;
  question_total integer;
  correct_total integer;
  score_percentage integer;
  earned_xp integer;
begin
  if actor_id is null or not public.is_codecraft_user_active() then
    raise exception 'Active sign-in required' using errcode = '42501';
  end if;

  select a.quiz_id, q.xp_reward into target_quiz_id, quiz_xp
  from public.quiz_attempts a
  join public.quizzes q on q.id = a.quiz_id and q.published
  where a.id = p_attempt_id
    and a.clerk_user_id = actor_id
    and a.status = 'in_progress'
  for update of a;

  if target_quiz_id is null then
    raise exception 'Quiz draft not found';
  end if;

  if jsonb_typeof(coalesce(p_answers, '{}'::jsonb)) <> 'object' then
    raise exception 'Quiz answers must be an object';
  end if;

  if exists (
    select 1
    from jsonb_each(coalesce(p_answers, '{}'::jsonb)) answer(question_id, selected_option)
    left join public.quiz_questions q
      on q.id::text = answer.question_id and q.quiz_id = target_quiz_id
    where q.id is null or not (q.options @> jsonb_build_array(answer.selected_option))
  ) then
    raise exception 'Quiz answers contain an invalid option';
  end if;

  select count(*), count(*) filter (where key.correct_answer = (coalesce(p_answers, '{}'::jsonb) -> question.id::text))
  into question_total, correct_total
  from public.quiz_questions question
  join public.quiz_answer_keys key on key.question_id = question.id
  where question.quiz_id = target_quiz_id;

  score_percentage := case when question_total = 0 then 0 else round((correct_total::numeric / question_total::numeric) * 100)::integer end;
  earned_xp := round((score_percentage::numeric / 100) * coalesce(quiz_xp, 0))::integer;

  update public.quiz_attempts
  set answers = coalesce(p_answers, '{}'::jsonb),
      score = coalesce(correct_total, 0),
      total_questions = coalesce(question_total, 0),
      percentage = score_percentage,
      xp_earned = earned_xp,
      time_used = greatest(0, coalesce(p_time_used, 0)),
      status = case when p_timed_out then 'timed_out' else 'completed' end,
      submitted_at = now()
  where id = p_attempt_id and clerk_user_id = actor_id and status = 'in_progress';

  return query select p_attempt_id, coalesce(correct_total, 0), coalesce(question_total, 0), score_percentage, earned_xp;
end;
$$;

create or replace function public.get_codecraft_quiz_attempt_review(
  p_attempt_id uuid
)
returns table (
  question_id uuid,
  question text,
  options jsonb,
  selected_option jsonb,
  correct_answer jsonb,
  explanation text,
  is_correct boolean
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_id text := public.current_codecraft_user_id();
begin
  if actor_id is null or not public.is_codecraft_user_active() then
    raise exception 'Active sign-in required' using errcode = '42501';
  end if;

  return query
  select
    q.id as question_id,
    q.question,
    q.options,
    coalesce(a.answers -> q.id::text, 'null'::jsonb) as selected_option,
    key.correct_answer,
    key.explanation,
    coalesce((a.answers -> q.id::text) = key.correct_answer, false) as is_correct
  from public.quiz_attempts a
  join public.quiz_questions q on q.quiz_id = a.quiz_id
  left join public.quiz_answer_keys key on key.question_id = q.id
  where a.id = p_attempt_id
    and a.clerk_user_id = actor_id
    and a.status in ('completed', 'timed_out')
  order by q.position, q.created_at;
end;
$$;

revoke all on function public.save_codecraft_quiz_progress(uuid, jsonb, integer, integer) from public;
revoke all on function public.evaluate_codecraft_quiz_answer(uuid, uuid, jsonb) from public;
revoke all on function public.finish_codecraft_quiz(uuid, jsonb, integer, boolean) from public;
revoke all on function public.get_codecraft_quiz_attempt_review(uuid) from public;
grant execute on function public.save_codecraft_quiz_progress(uuid, jsonb, integer, integer) to anon, authenticated;
grant execute on function public.evaluate_codecraft_quiz_answer(uuid, uuid, jsonb) to anon, authenticated;
grant execute on function public.finish_codecraft_quiz(uuid, jsonb, integer, boolean) to anon, authenticated;
grant execute on function public.get_codecraft_quiz_attempt_review(uuid) to anon, authenticated;

commit;