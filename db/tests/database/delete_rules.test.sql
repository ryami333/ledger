-- Checks the delete rules of members, aliases, and space currencies
-- (PLAN.md, D5, D7, and D8). A row in use cannot be deleted. A row that is
-- not in use can be deleted. A delete of a space deletes all its rows.

begin;

\ir helpers.psql
\ir fixtures.psql

select plan(9);

select tests.authenticate_as('00000000-0000-0000-0000-00000000000a');

select throws_ok(
  $$ delete from public.members where id = '20000000-0000-0000-0000-0000000000a2' $$,
  '23503',
  null,
  'delete.members: a member in an alias or a transaction is refused'
);

select isnt_empty(
  $$ delete from public.members where id = '20000000-0000-0000-0000-0000000000a3' returning id $$,
  'delete.members: a member with no alias and no transaction is deleted'
);

select throws_ok(
  $$ delete from public.aliases where id = '30000000-0000-0000-0000-00000000000a' $$,
  '23503',
  null,
  'delete.aliases: an alias with transactions is refused'
);

select lives_ok(
  $$ select tests.run_with_deferred_checks($q$
       delete from public.aliases where id = '30000000-0000-0000-0000-0000000000a2'
     $q$) $$,
  'delete.aliases: an alias with no transactions is deleted, with its members'
);

select throws_ok(
  $$ delete from public.space_currencies
     where space_id = '10000000-0000-0000-0000-00000000000a' and currency = 'USD' $$,
  '23503',
  null,
  'delete.space_currencies: a currency with transactions is refused'
);

select lives_ok(
  $$ select tests.run_with_deferred_checks($q$
       select public.save_space_currencies('10000000-0000-0000-0000-00000000000b',
         '[{"currency": "EUR", "rate": "1", "is_default": true},
           {"currency": "CHF", "rate": "1.05", "is_default": false}]')
     $q$) $$,
  'save_space_currencies: adds a currency'
);

select lives_ok(
  $$ select tests.run_with_deferred_checks($q$
       select public.save_space_currencies('10000000-0000-0000-0000-00000000000b',
         '[{"currency": "EUR", "rate": "1", "is_default": true}]')
     $q$) $$,
  'save_space_currencies: removes a currency with no transactions'
);

select lives_ok(
  $$ select tests.run_with_deferred_checks($q$
       delete from public.spaces where id = '10000000-0000-0000-0000-00000000000a'
     $q$) $$,
  'delete.spaces: a delete of a space with members, aliases, and transactions succeeds'
);

select tests.clear_authentication();

select is(
  (select count(*)::integer from public.transaction_parties
   where space_id = '10000000-0000-0000-0000-00000000000a')
  + (select count(*)::integer from public.members
     where space_id = '10000000-0000-0000-0000-00000000000a')
  + (select count(*)::integer from public.space_currencies
     where space_id = '10000000-0000-0000-0000-00000000000a'),
  0,
  'delete.spaces: the rows of the space are deleted'
);

select * from finish();

rollback;
