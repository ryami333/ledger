-- Adds the role of a user (PLAN.md, D19): better_auth.users.role, 'admin' or
-- 'guest'. A new row gets 'guest'. The web app sets 'admin' when a Pocket ID
-- sign-in makes the user.
--
-- The update gives 'admin' to each user with a Pocket ID account. Before
-- this migration, Pocket ID was the only sign-in, thus each such user is an
-- admin.
--
-- Safe to run two times: the column uses "if not exists", the check is
-- dropped with "if exists" before it is added, and the update finds no row
-- after the first run.
--
-- Rollback: drop the check users_role_check, then drop the column role of
-- better_auth.users. No earlier migration defines them.

ALTER TABLE "better_auth"."users" ADD COLUMN IF NOT EXISTS "role" text NOT NULL DEFAULT 'guest'::text;

ALTER TABLE "better_auth"."users" DROP CONSTRAINT IF EXISTS "users_role_check";

ALTER TABLE "better_auth"."users" ADD CONSTRAINT "users_role_check" CHECK ((role = ANY (ARRAY['admin'::text, 'guest'::text])));

update better_auth.users
set role = 'admin'
where role = 'guest'
  and exists (
    select 1
    from better_auth.accounts
    where accounts.user_id = users.id
      and accounts.provider_id = 'pocket-id'
  );
