begin;

alter table public.challenge_submissions
  add column if not exists project_id uuid references public.projects(id) on delete set null,
  add column if not exists project_snapshot jsonb not null default '{}'::jsonb;

create index if not exists challenge_submissions_project_idx
  on public.challenge_submissions (project_id, submitted_at desc);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'projects'
      AND column_name = 'user_id'
  ) THEN
    UPDATE public.projects
    SET clerk_user_id = user_id::text
    WHERE clerk_user_id IS NULL AND user_id IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'project_files'
      AND column_name = 'user_id'
  ) THEN
    UPDATE public.project_files pf
    SET clerk_user_id = p.clerk_user_id
    FROM public.projects p
    WHERE pf.project_id = p.id
      AND pf.clerk_user_id IS NULL
      AND p.clerk_user_id IS NOT NULL;
  END IF;
END $$;

create or replace function public.submit_codecraft_project_challenge(
  p_challenge_id uuid,
  p_project_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_id text := public.current_codecraft_user_id();
  project_data jsonb;
  challenge_row public.challenges%rowtype;
  snapshot_json jsonb;
  submission_id uuid;
  submission_time timestamptz;
  has_legacy_project_user_id_column boolean;
  has_legacy_project_file_user_id_column boolean;
begin
  if actor_id is null or not public.is_codecraft_user_active() then
    raise exception 'Active sign-in required' using errcode = '42501';
  end if;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'projects'
      and column_name = 'user_id'
  ) into has_legacy_project_user_id_column;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'project_files'
      and column_name = 'user_id'
  ) into has_legacy_project_file_user_id_column;

  if has_legacy_project_user_id_column then
    select to_jsonb(p) into project_data
    from public.projects p
    where p.id = p_project_id
      and (p.clerk_user_id = actor_id or p.user_id::text = actor_id)
    for share;
  else
    select to_jsonb(p) into project_data
    from public.projects p
    where p.id = p_project_id and p.clerk_user_id = actor_id
    for share;
  end if;

  if project_data is null then
    raise exception 'Project not found or unavailable.' using errcode = '42501';
  end if;

  select * into challenge_row
  from public.challenges c
  where c.id = p_challenge_id and c.published = true;
  if not found then
    raise exception 'Challenge not found or unavailable.';
  end if;
  if challenge_row.prerequisite_challenge_id is not null and not exists (
    select 1 from public.challenge_completions completion
    where completion.challenge_id = challenge_row.prerequisite_challenge_id
      and completion.clerk_user_id = actor_id
  ) then
    raise exception 'Complete the prerequisite challenge before submitting.';
  end if;

  if has_legacy_project_file_user_id_column then
    select jsonb_build_object(
      'id', project_data->>'id',
      'name', project_data->>'title',
      'description', coalesce(project_data->>'description', ''),
      'language', coalesce(project_data->>'language', 'HTML'),
      'created_at', project_data->>'created_at',
      'updated_at', project_data->>'updated_at',
      'legacy_code', project_data->>'code',
      'files', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', project_file.id,
          'name', project_file.name,
          'path', project_file.path,
          'language', project_file.language,
          'content', project_file.content,
          'created_at', project_file.created_at,
          'updated_at', project_file.updated_at
        ) order by project_file.path, project_file.created_at, project_file.id)
        from public.project_files project_file
        where project_file.project_id = (project_data->>'id')::uuid
          and (project_file.clerk_user_id = actor_id or project_file.user_id::text = actor_id)
      ), '[]'::jsonb)
    ) into snapshot_json;
  else
    select jsonb_build_object(
      'id', project_data->>'id',
      'name', project_data->>'title',
      'description', coalesce(project_data->>'description', ''),
      'language', coalesce(project_data->>'language', 'HTML'),
      'created_at', project_data->>'created_at',
      'updated_at', project_data->>'updated_at',
      'legacy_code', project_data->>'code',
      'files', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', project_file.id,
          'name', project_file.name,
          'path', project_file.path,
          'language', project_file.language,
          'content', project_file.content,
          'created_at', project_file.created_at,
          'updated_at', project_file.updated_at
        ) order by project_file.path, project_file.created_at, project_file.id)
        from public.project_files project_file
        where project_file.project_id = (project_data->>'id')::uuid
          and project_file.clerk_user_id = actor_id
      ), '[]'::jsonb)
    ) into snapshot_json;
  end if;

  insert into public.challenge_submissions (
    challenge_id,
    clerk_user_id,
    submitted_code,
    status,
    project_id,
    project_snapshot
  ) values (
    p_challenge_id,
    actor_id,
    snapshot_json::text,
    'submitted',
    (project_data->>'id')::uuid,
    snapshot_json
  )
  returning id, submitted_at into submission_id, submission_time;

  return jsonb_build_object(
    'submission_id', submission_id,
    'challenge_id', p_challenge_id,
    'project_id', (project_data->>'id')::uuid,
    'project_name', project_data->>'title',
    'submitted_at', submission_time
  );
end;
$$;

revoke all on function public.submit_codecraft_project_challenge(uuid, uuid) from public, anon, authenticated;
grant execute on function public.submit_codecraft_project_challenge(uuid, uuid) to authenticated;

commit;