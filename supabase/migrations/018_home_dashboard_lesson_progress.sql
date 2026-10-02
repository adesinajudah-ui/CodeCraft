begin;

-- Lesson progress: the only Home-dashboard data source missing from the schema.
-- Streaks / recent activity / quiz / challenge / certificate data are derived from
-- existing tables (quiz_attempts, challenge_completions, certificates, challenge_progress).
create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  first_opened_at timestamptz not null default now(),
  last_viewed_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clerk_user_id, lesson_id)
);

create index if not exists lesson_progress_user_idx on public.lesson_progress (clerk_user_id, last_viewed_at desc);
create index if not exists lesson_progress_course_idx on public.lesson_progress (course_id);

alter table public.lesson_progress enable row level security;

drop policy if exists "Users read own lesson progress" on public.lesson_progress;
drop policy if exists "Users write own lesson progress" on public.lesson_progress;

create policy "Users read own lesson progress"
on public.lesson_progress for select to public
using (clerk_user_id = public.current_codecraft_user_id() or public.is_codecraft_admin());

create policy "Users write own lesson progress"
on public.lesson_progress for insert to public
with check (clerk_user_id = public.current_codecraft_user_id());

create policy "Users update own lesson progress"
on public.lesson_progress for update to public
using (clerk_user_id = public.current_codecraft_user_id())
with check (clerk_user_id = public.current_codecraft_user_id());

revoke delete on public.lesson_progress from anon, authenticated;
grant select, insert, update on public.lesson_progress to authenticated;

commit;
