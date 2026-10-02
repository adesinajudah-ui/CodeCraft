begin;

alter table public.user_account_status
  alter column status set default 'active';

update public.user_account_status
set status = 'active'
where status is null;

alter table public.user_account_status
  alter column status set not null;

insert into public.user_account_status (clerk_user_id, status)
select existing_users.clerk_user_id, 'active'
from (
  select clerk_user_id from public.profiles
  union
  select clerk_user_id from public.admin_roles
) as existing_users
on conflict (clerk_user_id) do nothing;

create or replace function public.is_codecraft_user_active()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select not exists (
    select 1
    from public.user_account_status s
    where s.clerk_user_id = public.current_codecraft_user_id()
      and s.status in ('suspended', 'banned')
  )
$$;

revoke all on function public.is_codecraft_user_active() from public;
grant execute on function public.is_codecraft_user_active() to anon, authenticated;

commit;
