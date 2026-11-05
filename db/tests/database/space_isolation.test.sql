-- Checks that the composite foreign keys keep each row in one space: a party,
-- an alias member, and a transaction currency of a different space are
-- refused (PLAN.md, data model).

begin;

\ir helpers.psql
\ir fixtures.psql

select plan(5);

select tests.authenticate_as('00000000-0000-0000-0000-00000000000a');

select throws_ok(
  $$ insert into public.transaction_parties (transaction_id, space_id, side, member_id)
     values ('40000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a',
             'paid_for', '20000000-0000-0000-0000-0000000000b1') $$,
  '23503',
  null,
  'insert.transaction_parties: a member of a different space is refused'
);

select throws_ok(
  $$ insert into public.transaction_parties (transaction_id, space_id, side, member_id)
     values ('40000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000b',
             'paid_for', '20000000-0000-0000-0000-0000000000b1') $$,
  '23503',
  null,
  'insert.transaction_parties: a party with the space of a different transaction is refused'
);

select throws_ok(
  $$ insert into public.alias_members (alias_id, member_id, space_id)
     values ('30000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000b1',
             '10000000-0000-0000-0000-00000000000a') $$,
  '23503',
  null,
  'insert.alias_members: a member of a different space is refused'
);

select throws_ok(
  $$ select public.save_transaction(
       null, '10000000-0000-0000-0000-00000000000b', 'Taxi', null, 1000, 'USD', null, '2026-11-02',
       '[{"member_id": "20000000-0000-0000-0000-0000000000b1"}]',
       '[{"member_id": "20000000-0000-0000-0000-0000000000b1"}]') $$,
  '23503',
  null,
  'save_transaction: a currency that is not a currency of the space is refused'
);

select throws_ok(
  $$ select public.save_alias(
       null, '10000000-0000-0000-0000-00000000000a', 'Mixed',
       array['20000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000b1']::uuid[]) $$,
  '23503',
  null,
  'save_alias: a member of a different space is refused'
);

select * from finish();

rollback;
