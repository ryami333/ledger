-- Checks the access of a guest (PLAN.md, D20). Guest C has space A only.
-- The guest reads and changes space A, and sees nothing of space B. Only an
-- admin makes a space and writes space_guests.

begin;

\ir helpers.psql
\ir fixtures.psql

select plan(22);

-- The current user

select tests.authenticate_as('00000000-0000-0000-0000-00000000000c');

select is(public.current_user_is_admin(), false, 'current_user_is_admin: a guest gets false');

select tests.authenticate_as('00000000-0000-0000-0000-00000000000a');

select is(public.current_user_is_admin(), true, 'current_user_is_admin: an admin gets true');

select tests.authenticate_as('00000000-0000-0000-0000-0000000000ff');

select is(public.current_user_is_admin(), false, 'current_user_is_admin: an unknown user gets false');

-- Read

select tests.authenticate_as('00000000-0000-0000-0000-00000000000c');

select set_eq(
  'select id from public.spaces',
  array['10000000-0000-0000-0000-00000000000a']::uuid[],
  'select.spaces: a guest reads only the spaces of the guest'
);

select is_empty(
  $$ select 1 from public.members where space_id = '10000000-0000-0000-0000-00000000000b'
     union all
     select 1 from public.space_currencies where space_id = '10000000-0000-0000-0000-00000000000b' $$,
  'select.members, space_currencies: a guest reads nothing of a different space'
);

select isnt_empty(
  $$ select 1 from public.transactions join public.transaction_parties on transaction_parties.transaction_id = transactions.id $$,
  'select.transactions, transaction_parties: a guest reads the transactions of a space of the guest'
);

select set_eq(
  'select space_id, user_id from public.space_guests',
  $$ values ('10000000-0000-0000-0000-00000000000a'::uuid, '00000000-0000-0000-0000-00000000000c'::uuid) $$,
  'select.space_guests: a guest reads the rows of the guest itself'
);

-- Write

select isnt_empty(
  $$ insert into public.members (space_id, name)
     values ('10000000-0000-0000-0000-00000000000a', 'Kamala')
     returning id $$,
  'insert.members: a guest adds a member to a space of the guest'
);

select throws_ok(
  $$ insert into public.members (space_id, name)
     values ('10000000-0000-0000-0000-00000000000b', 'Kamala') $$,
  '42501',
  null,
  'insert.members: a guest cannot add a member to a different space'
);

select is_empty(
  $$ update public.spaces set title = 'Taken'
     where id = '10000000-0000-0000-0000-00000000000b'
     returning id $$,
  'update.spaces: a guest cannot rename a different space'
);

select is_empty(
  $$ delete from public.spaces where id = '10000000-0000-0000-0000-00000000000b' returning id $$,
  'delete.spaces: a guest cannot delete a different space'
);

select throws_ok(
  $$ select public.save_transaction(
       null, '10000000-0000-0000-0000-00000000000b', 'Taxi', null, 1000, 'EUR', null, '2026-11-02',
       '[{"member_id": "20000000-0000-0000-0000-0000000000b1"}]',
       '[{"member_id": "20000000-0000-0000-0000-0000000000b1"}]') $$,
  '42501',
  null,
  'save_transaction: a guest cannot add a transaction to a different space'
);

select throws_ok(
  $$ insert into public.spaces (title) values ('Space C') $$,
  '42501',
  null,
  'insert.spaces: a guest cannot make a space'
);

select throws_ok(
  $$ select public.create_space('Space C', null, 'EUR', array['Kamala']) $$,
  '42501',
  null,
  'create_space: a guest cannot make a space'
);

select throws_ok(
  $$ select public.set_linked_member('10000000-0000-0000-0000-00000000000b', '20000000-0000-0000-0000-0000000000b1') $$,
  '42501',
  null,
  'set_linked_member: a guest cannot select a member of a different space'
);

select throws_ok(
  $$ select public.set_default_space('10000000-0000-0000-0000-00000000000b') $$,
  '42501',
  null,
  'set_default_space: a guest cannot select a different space'
);

select throws_ok(
  $$ select public.set_space_guests('00000000-0000-0000-0000-00000000000c', array['10000000-0000-0000-0000-00000000000b']::uuid[]) $$,
  '42501',
  null,
  'set_space_guests: a guest cannot change the spaces of a guest'
);

select throws_ok(
  $$ insert into public.space_guests (space_id, user_id)
     values ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000c') $$,
  '42501',
  null,
  'insert.space_guests: a guest cannot add a space'
);

-- The default space of the guest stays, but the guest no longer reads it
-- after the admin removes the space.
select lives_ok(
  $$ select public.set_default_space('10000000-0000-0000-0000-00000000000a') $$,
  'set_default_space: a guest selects a space of the guest'
);

-- An admin

select tests.authenticate_as('00000000-0000-0000-0000-00000000000a');

select lives_ok(
  $$ select public.set_space_guests('00000000-0000-0000-0000-00000000000c', array['10000000-0000-0000-0000-00000000000b']::uuid[]) $$,
  'set_space_guests: an admin replaces the spaces of a guest'
);

select set_eq(
  $$ select space_id from public.space_guests where user_id = '00000000-0000-0000-0000-00000000000c' $$,
  array['10000000-0000-0000-0000-00000000000b']::uuid[],
  'set_space_guests: the guest has only the new spaces'
);

select tests.authenticate_as('00000000-0000-0000-0000-00000000000c');

select is_empty(
  'select 1 from public.default_spaces',
  'select.default_spaces: a guest does not read a default space that the guest lost'
);

select * from finish();

rollback;
