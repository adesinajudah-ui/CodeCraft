begin;

-- Quiz Builder columns: admin-authored source code + builder metadata.
alter table public.quizzes
  add column if not exists html_source text not null default '',
  add column if not exists css_source text not null default '',
  add column if not exists js_source text not null default '',
  add column if not exists icon text not null default 'CC',
  add column if not exists randomize_options boolean not null default false,
  add column if not exists builder_version integer not null default 0;

-- Stable per-quiz question key so re-saving a definition keeps question UUIDs
-- (and therefore historical attempt reviews) intact.
alter table public.quiz_questions
  add column if not exists question_key text;

create unique index if not exists quiz_questions_quiz_key_idx
  on public.quiz_questions (quiz_id, question_key);

update public.quiz_questions
set question_key = 'legacy::' || id::text
where question_key is null;

create or replace function public.save_codecraft_quiz_from_builder(p_quiz jsonb)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_id text := public.current_codecraft_user_id();
  v_quiz_id uuid;
  v_published boolean;
  v_question jsonb;
  v_options jsonb;
  v_question_id uuid;
  v_position integer := 0;
  v_question_key text;
  v_keys text[] := '{}';
  v_option_count integer;
  v_distinct_count integer;
begin
  if actor_id is null or not public.is_codecraft_user_active() then
    raise exception 'Active sign-in required' using errcode = '42501';
  end if;

  if not public.is_codecraft_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  if p_quiz is null or jsonb_typeof(p_quiz) <> 'object' then
    raise exception 'Quiz payload must be an object';
  end if;

  v_published := coalesce((p_quiz ->> 'published')::boolean, false);

  if coalesce(p_quiz ->> 'title', '') = '' then
    raise exception 'Quiz title is required';
  end if;

  if coalesce(p_quiz ->> 'id', '') = '' then
    insert into public.quizzes (
      title, description, category, difficulty, xp_reward, time_limit_seconds,
      feedback_mode, icon, randomize_options, html_source, css_source, js_source,
      position, published, created_by, builder_version
    ) values (
      p_quiz ->> 'title',
      coalesce(p_quiz ->> 'description', ''),
      coalesce(p_quiz ->> 'category', 'General Programming'),
      coalesce(p_quiz ->> 'difficulty', 'Beginner'),
      greatest(0, coalesce((p_quiz ->> 'xp_reward')::integer, 100)),
      greatest(0, coalesce((p_quiz ->> 'time_limit_seconds')::integer, 300)),
      coalesce(p_quiz ->> 'feedback_mode', 'end'),
      coalesce(p_quiz ->> 'icon', 'CC'),
      coalesce((p_quiz ->> 'randomize_options')::boolean, false),
      coalesce(p_quiz ->> 'html_source', ''),
      coalesce(p_quiz ->> 'css_source', ''),
      coalesce(p_quiz ->> 'js_source', ''),
      greatest(0, coalesce((p_quiz ->> 'position')::integer, 0)),
      v_published,
      actor_id,
      1
    )
    returning id into v_quiz_id;
  else
    update public.quizzes set
      title = p_quiz ->> 'title',
      description = coalesce(p_quiz ->> 'description', ''),
      category = coalesce(p_quiz ->> 'category', category),
      difficulty = coalesce(p_quiz ->> 'difficulty', difficulty),
      xp_reward = greatest(0, coalesce((p_quiz ->> 'xp_reward')::integer, xp_reward)),
      time_limit_seconds = greatest(0, coalesce((p_quiz ->> 'time_limit_seconds')::integer, time_limit_seconds)),
      feedback_mode = coalesce(p_quiz ->> 'feedback_mode', feedback_mode),
      icon = coalesce(p_quiz ->> 'icon', icon),
      randomize_options = coalesce((p_quiz ->> 'randomize_options')::boolean, randomize_options),
      html_source = coalesce(p_quiz ->> 'html_source', ''),
      css_source = coalesce(p_quiz ->> 'css_source', ''),
      js_source = coalesce(p_quiz ->> 'js_source', ''),
      position = greatest(0, coalesce((p_quiz ->> 'position')::integer, position)),
      published = v_published,
      builder_version = 1,
      updated_at = now()
    where id = (p_quiz ->> 'id')::uuid
    returning id into v_quiz_id;

    if v_quiz_id is null then
      raise exception 'Quiz not found';
    end if;
  end if;

  -- Questions are only synced when the builder managed to parse a definition.
  -- Draft saves with an unparseable definition keep the existing questions.
  if p_quiz ? 'questions' then
    if jsonb_typeof(p_quiz -> 'questions') <> 'array' then
      raise exception 'Quiz questions must be an array';
    end if;

    for v_question in select * from jsonb_array_elements(p_quiz -> 'questions') loop
      v_question_key := coalesce(v_question ->> 'key', 'q' || (v_position + 1)::text);

      if v_question_key = any (v_keys) then
        raise exception 'Duplicate question key "%"', v_question_key;
      end if;

      if coalesce(v_question ->> 'text', '') = '' then
        raise exception 'Question % is missing its text', v_position + 1;
      end if;

      v_options := v_question -> 'options';
      if v_options is null or jsonb_typeof(v_options) <> 'array' then
        raise exception 'Question % is missing answer options', v_position + 1;
      end if;

      if exists (
        select 1 from jsonb_array_elements(v_options) o
        where jsonb_typeof(o) not in ('string')
      ) then
        raise exception 'Question % has an invalid option', v_position + 1;
      end if;

      select count(*), count(distinct o) into v_option_count, v_distinct_count
      from jsonb_array_elements_text(v_options) o;

      if v_option_count < 2 then
        raise exception 'Question % needs at least two options', v_position + 1;
      end if;

      if v_distinct_count <> v_option_count then
        raise exception 'Question % has duplicate option text', v_position + 1;
      end if;

      if v_question -> 'correct_answer' is null
        or not (v_options @> jsonb_build_array(v_question -> 'correct_answer')) then
        raise exception 'Question % has no valid correct answer', v_position + 1;
      end if;

      insert into public.quiz_questions (quiz_id, question_key, question, options, position)
      values (v_quiz_id, v_question_key, v_question ->> 'text', v_options, v_position)
      on conflict (quiz_id, question_key) do update
        set question = excluded.question,
            options = excluded.options,
            position = excluded.position,
            updated_at = now()
      returning id into v_question_id;

      insert into public.quiz_answer_keys (question_id, correct_answer, explanation)
      values (v_question_id, v_question -> 'correct_answer', coalesce(v_question ->> 'explanation', ''))
      on conflict (question_id) do update
        set correct_answer = excluded.correct_answer,
            explanation = excluded.explanation;

      v_keys := v_keys || v_question_key;
      v_position := v_position + 1;
    end loop;

    -- Remove questions that are no longer part of the parsed definition
    -- (legacy rows carry a null or "legacy::" key).
    delete from public.quiz_questions
    where quiz_id = v_quiz_id
      and (question_key is null or not (question_key = any (v_keys)));
  end if;

  insert into public.audit_logs (actor_clerk_user_id, action, target_type, target_id, details)
  values (
    actor_id,
    case when v_published then 'quiz_builder_published' else 'quiz_builder_saved' end,
    'quiz',
    v_quiz_id::text,
    jsonb_build_object(
      'title', p_quiz ->> 'title',
      'published', v_published,
      'question_count', v_position
    )
  );

  return v_quiz_id;
end;
$$;

revoke all on function public.save_codecraft_quiz_from_builder(jsonb) from public;
grant execute on function public.save_codecraft_quiz_from_builder(jsonb) to anon, authenticated;

commit;
