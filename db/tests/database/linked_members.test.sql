-- Checks linked_members and set_linked_member (PLAN.md, D16). A user links
-- only the user itself, a member has at most one user, and a delete of the
-- member deletes the link.

begin;

\ir helpers.psql
\ir fixtures.psql

select plan(12);

select tests.authenticate_as('00000000-0000-0000-0000-00000000000a');

select is(
  public.set_linked_member('10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a1'),
  '10000000-0000-0000-0000-00000000000a'::uuid,
  'set_linked_member: user A selects Barack, and gets the ID of the space'
);

select results_eq(
  $$ select user_id, member_id from public.linked_members
     where space_id = '10000000-0000-0000-0000-00000000000a' $$,
  $$ values ('00000000-0000-0000-0000-00000000000a'::uuid, '20000000-0000-0000-0000-0000000000a1'::uuid) $$,
  'set_linked_member: the trigger sets user_id to user A'
);

select lives_ok(
  $$ select public.set_linked_member('10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a2') $$,
  'set_linked_member: user A selects Michelle in place of Barack'
);

select results_eq(
  $$ select member_id from public.linked_members
     where space_id = '10000000-0000-0000-0000-00000000000a' $$,
  $$ values ('20000000-0000-0000-0000-0000000000a2'::uuid) $$,
  'set_linked_member: user A has one linked member in the space'
);

select throws_ok(
  $$ select public.set_linked_member('10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000b1') $$,
  '23503',
  null,
  'set_linked_member: a member of a different space is refused'
);

select throws_ok(
  $$ insert into public.linked_members (space_id, user_id, member_id)
     values ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b',
             '20000000-0000-0000-0000-0000000000b1') $$,
  '42501',
  null,
  'insert.linked_members: user A cannot send user_id'
);

select tests.authenticate_as('00000000-0000-0000-0000-00000000000b');

select throws_ok(
  $$ select public.set_linked_member('10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a2') $$,
  '23505',
  null,
  'set_linked_member: user B cannot select the linked member of user A'
);

select is_empty(
  $$ delete from public.linked_members
     where space_id = '10000000-0000-0000-0000-00000000000a'
     returning user_id $$,
  'delete.linked_members: user B cannot delete the link of user A'
);

select isnt_empty(
  $$ select 1 from public.linked_members
     where user_id = '00000000-0000-0000-0000-00000000000a' $$,
  'select.linked_members: user B reads the link of user A'
);

select tests.authenticate_as('00000000-0000-0000-0000-00000000000a');

select lives_ok(
  $$ select public.set_linked_member('10000000-0000-0000-0000-00000000000a', null) $$,
  'set_linked_member: null removes the linked member of user A'
);

-- Donald is in no alias and no transaction, thus a delete of Donald works.
select public.set_linked_member('10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a3');
delete from public.members where id = '20000000-0000-0000-0000-0000000000a3';

select is_empty(
  $$ select 1 from public.linked_members
     where user_id = '00000000-0000-0000-0000-00000000000a' $$,
  'delete.members: a delete of the member deletes its link'
);

select tests.authenticate_as_anon();

select throws_ok(
  $$ select * from public.linked_members $$,
  '42501',
  null,
  'select.linked_members: anon is refused'
);

select * from finish();

rollback;
