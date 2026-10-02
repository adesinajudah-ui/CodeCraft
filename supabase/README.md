# Supabase setup for CodeCraft

This project keeps Clerk as the only authentication layer. Supabase is used strictly for PostgreSQL data and storage.

Required environment variables:

VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key

Do not add a secret/service-role key to the frontend.

Recommended migration steps:
1. Create the Supabase project.
2. Run migrations `001_create_community_schema.sql` through `011_award_xp_on_admin_acceptance.sql` in numeric order. Existing projects that already applied 001-010 should run only 011.
3. Create storage buckets: project-files, post-images, and project-previews.
4. Ensure the Clerk user ID is available in the Supabase JWT subject if you use RLS via custom JWT claims.
5. Keep Clerk auth in place for login, session, and identity.

## First administrator bootstrap

After migration 006 succeeds, open Supabase Dashboard → SQL Editor and run this once. Replace `YOUR_CLERK_USER_ID` with the Clerk user ID (the `user_...` value) of the first administrator. This SQL Editor operation runs with database-owner privileges; ordinary clients cannot insert or modify admin roles. Do not put the ID in frontend configuration.

```sql
insert into public.admin_roles (clerk_user_id, created_by)
values ('YOUR_CLERK_USER_ID', 'supabase-bootstrap')
on conflict (clerk_user_id) do nothing;
```

Migration 006 adds database-backed admin authorization and RLS, account suspension, reports, persisted courses/lessons, challenges, private challenge validation data, quizzes/questions/answer keys, quiz attempts, certificates, and scheduled announcements. It replaces the initial admin-role policies from migration 005. It is intended to be applied once after the earlier migrations; do not rerun it after a successful application.

Migration 007 fixes account access checks: only an explicit `suspended` or `banned` status blocks access, a missing status row means active, and existing profiles/admin IDs receive an `active` row only when no status row already exists. Existing explicit suspension/ban records are preserved. Apply migration 007 after 006.

Migration 009 adds an optional project reference and immutable JSON snapshot to challenge submissions. Its `submit_codecraft_project_challenge` RPC verifies the active Clerk user owns both the published challenge access and selected project, then stores the project metadata and files at submission time. Clients receive execute permission on the RPC only; direct challenge-submission writes remain unavailable. Apply migration 009 after 008.

Migration 010 adds admin review decisions and review scores for challenge submissions. Its `review_codecraft_challenge_submission` RPC verifies administrator access before saving an accepted or declined decision and a score. Apply migration 010 after 009 to enable the admin review controls.

Migration 011 updates the admin review RPC so accepting a submission creates a unique challenge completion and awards the challenge XP once. It also backfills submissions already accepted by an admin. Apply migration 011 after 010 so accepted submissions update the learner's completed, in-progress, and XP totals.

To inspect a specific account in Supabase SQL Editor, replace `CLERK_USER_ID` with its Clerk `user_...` ID:

```sql
select p.clerk_user_id, coalesce(s.status, 'active') as effective_status,
	   s.suspended_at, s.suspended_by, s.reason
from public.profiles p
left join public.user_account_status s using (clerk_user_id)
where p.clerk_user_id = 'CLERK_USER_ID';
```

Quiz answer keys and challenge validation data are admin-only. Quiz scores are calculated and stored by the `submit_codecraft_quiz` database function. Migration 008 adds challenge test cases, submissions, unique completion records, XP/level/streak progress, a public-profile-only leaderboard, and a service-role-only evaluation transaction. Only the evaluator may write a score, completion, or XP award.

## Challenge execution setup

Migration 008 alone does not run user code. The `evaluate-challenge` Supabase Edge Function delegates execution to Judge0; do not replace it with client-side `eval` for grading. Until the function is deployed and its secrets are set, Run Code and Submit Solution return a configuration error and award no XP.

Deploy from a Supabase CLI workspace linked to the project:

```sh
supabase functions deploy evaluate-challenge
```

Configure Edge Function secrets in the Supabase dashboard or CLI. `CLERK_ISSUER` and `CLERK_JWKS_URL` must match the Clerk token issuer/JWKS for this application. `JUDGE0_API_URL` is the Judge0 service base URL; set the API key/host only for providers that require them.

```sh
supabase secrets set CLERK_ISSUER="https://YOUR_CLERK_ISSUER" CLERK_JWKS_URL="https://YOUR_CLERK_DOMAIN/.well-known/jwks.json" JUDGE0_API_URL="https://YOUR_JUDGE0_HOST" JUDGE0_API_KEY="YOUR_PROVIDER_KEY" JUDGE0_API_HOST="YOUR_PROVIDER_HOST"
```

The function verifies the Clerk JWT itself because Supabase's gateway verification is disabled for that function in `supabase/config.toml`. It then checks the account status and challenge prerequisite, runs the challenge in Judge0's execution sandbox, and uses the server-only Supabase service role to record results. The service-role key is never sent to the browser. Supported language IDs are JavaScript/Node.js, Python 3, and C++.

Clerk accounts remain managed by Clerk. Suspension does not disable Clerk sign-in, but blocks CodeCraft protected routes and database/storage access through status checks and restrictive RLS policies. Supabase table operations require Clerk JWTs whose `sub` claim is the Clerk user ID used by this app.
