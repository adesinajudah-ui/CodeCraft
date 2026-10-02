begin;

alter table public.quizzes
  add column if not exists category text not null default 'General Programming',
  add column if not exists difficulty text not null default 'Beginner',
  add column if not exists xp_reward integer not null default 100,
  add column if not exists time_limit_seconds integer not null default 300,
  add column if not exists feedback_mode text not null default 'end',
  add column if not exists pdf_url text,
  add column if not exists pdf_name text,
  add column if not exists pdf_uploaded_at timestamptz;

alter table public.quiz_attempts
  add column if not exists percentage integer not null default 0,
  add column if not exists xp_earned integer not null default 0,
  add column if not exists status text not null default 'completed' check (status in ('completed', 'timed_out')),
  add column if not exists time_used integer,
  add column if not exists started_at timestamptz;

update public.quiz_attempts
set percentage = case
  when total_questions is null or total_questions = 0 then 0
  else round((score::numeric / total_questions::numeric) * 100)
end,
    xp_earned = case
      when total_questions is null or total_questions = 0 then 0
      else round((score::numeric / total_questions::numeric) * 100) * coalesce((
        select q.xp_reward from public.quizzes q where q.id = quiz_attempts.quiz_id
      ), 0) / 100
    end,
    status = coalesce(status, 'completed'),
    time_used = coalesce(time_used, 0)
where percentage is null or xp_earned is null or status is null or time_used is null;

commit;
