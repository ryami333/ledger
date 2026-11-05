-- Checks the functions of PLAN.md, D9, and the deferred constraint triggers
-- that keep the rules of the lists: one default currency for each space, one
-- or more members for each alias, and one or more parties on each side of a
-- transaction.

begin;

\ir helpers.psql
\ir fixtures.psql

select plan(42);

select tests.authenticate_as('00000000-0000-0000-0000-00000000000a');

-- create_space

select lives_ok(
  $$ select tests.run_with_deferred_checks($q$
       select public.create_space('Washington', 'A trip', 'EUR', array['Barack', 'Michelle'])
     $q$) $$,
  'create_space: makes a space'
);

select results_eq(
  $$ select currency, rate::text, is_default from public.space_currencies
     join public.spaces on spaces.id = space_currencies.space_id
     where spaces.title = 'Washington' $$,
  $$ values ('EUR', '1.00000000', true) $$,
  'create_space: the default currency has the rate 1'
);

select is(
  (select count(*)::integer from public.members
   join public.spaces on spaces.id = members.space_id
   where spaces.title = 'Washington'),
  2,
  'create_space: adds the first members'
);

select throws_ok(
  $$ select tests.run_with_deferred_checks($q$
       insert into public.spaces (title) values ('No currency')
     $q$) $$,
  '23514',
  null,
  'insert.spaces: a space with no default currency is refused at the end of the transaction'
);

-- save_space_currencies

select throws_ok(
  $$ select public.save_space_currencies('10000000-0000-0000-0000-00000000000a',
       '[{"currency": "EUR", "rate": "1", "is_default": false}]') $$,
  '22023',
  null,
  'save_space_currencies: a list with no default currency is refused'
);

select throws_ok(
  $$ select public.save_space_currencies('10000000-0000-0000-0000-00000000000a',
       '[{"currency": "EUR", "rate": "1", "is_default": true},
         {"currency": "USD", "rate": "1", "is_default": true}]') $$,
  '22023',
  null,
  'save_space_currencies: a list with two default currencies is refused'
);

select throws_ok(
  $$ select public.save_space_currencies('10000000-0000-0000-0000-00000000000a',
       '[{"currency": "EUR", "rate": "1.1", "is_default": true},
         {"currency": "USD", "rate": "0.92", "is_default": false}]') $$,
  '23514',
  null,
  'save_space_currencies: a default rate that is not 1 is refused'
);

-- The rate of a transaction (PLAN.md, D5)

select lives_ok(
  $$ select tests.run_with_deferred_checks($q$
       select public.save_transaction(null, '10000000-0000-0000-0000-00000000000a',
         'Taxi', null, 1000, 'EUR', null, '2026-11-02',
         '[{"member_id": "20000000-0000-0000-0000-0000000000a1"}]',
         '[{"member_id": "20000000-0000-0000-0000-0000000000a2"}]')
     $q$) $$,
  'save_transaction: saves a transaction with no rate'
);

select lives_ok(
  $$ select tests.run_with_deferred_checks($q$
       select public.save_transaction(null, '10000000-0000-0000-0000-00000000000a',
         'Bus', null, 1000, 'USD', '0.9', '2026-11-02',
         '[{"member_id": "20000000-0000-0000-0000-0000000000a1"}]',
         '[{"member_id": "20000000-0000-0000-0000-0000000000a2"}]')
     $q$) $$,
  'save_transaction: saves a transaction with a rate'
);

select results_eq(
  $$ select title, rate::text from public.transactions
     where space_id = '10000000-0000-0000-0000-00000000000a'
     order by title $$,
  $$ values ('Bus', '0.90000000'), ('Dinner', '0.92000000'), ('Taxi', '1.00000000') $$,
  'save_transaction: a null rate gives the rate of the space currency, and a given rate stays'
);

select lives_ok(
  $$ select tests.run_with_deferred_checks($q$
       select public.save_space_currencies('10000000-0000-0000-0000-00000000000a',
         '[{"currency": "EUR", "rate": "1", "is_default": true},
           {"currency": "USD", "rate": "0.95", "is_default": false}]')
     $q$) $$,
  'save_space_currencies: changes the rate of USD'
);

select results_eq(
  $$ select title, rate::text from public.transactions
     where space_id = '10000000-0000-0000-0000-00000000000a'
     order by title $$,
  $$ values ('Bus', '0.90000000'), ('Dinner', '0.92000000'), ('Taxi', '1.00000000') $$,
  'save_space_currencies: a change of a rate keeps the rates of the transactions'
);

select throws_ok(
  $$ select public.save_transaction(null, '10000000-0000-0000-0000-00000000000a',
       'Lunch', null, 1000, 'EUR', '2', '2026-11-02',
       '[{"member_id": "20000000-0000-0000-0000-0000000000a1"}]',
       '[{"member_id": "20000000-0000-0000-0000-0000000000a2"}]') $$,
  '22023',
  null,
  'save_transaction: a rate other than 1 for the default currency is refused'
);

select lives_ok(
  $$ select tests.run_with_deferred_checks($q$
       select public.save_space_currencies('10000000-0000-0000-0000-00000000000a',
         '[{"currency": "USD", "rate": "1", "is_default": true},
           {"currency": "EUR", "rate": "1.08695652", "is_default": false},
           {"currency": "GBP", "rate": "1.27", "is_default": false}]')
     $q$) $$,
  'save_space_currencies: changes the default currency and adds a currency'
);

select results_eq(
  $$ select currency, rate::text, is_default from public.space_currencies
     where space_id = '10000000-0000-0000-0000-00000000000a'
     order by currency $$,
  $$ values ('EUR', '1.08695652', false), ('GBP', '1.27000000', false), ('USD', '1.00000000', true) $$,
  'save_space_currencies: the rows are the new list, with all digits of each rate'
);

select results_eq(
  $$ select title, rate::text from public.transactions
     where space_id = '10000000-0000-0000-0000-00000000000a'
     order by title $$,
  $$ values ('Bus', '1.00000000'), ('Dinner', '1.00000000'), ('Taxi', '1.08695652') $$,
  'save_space_currencies: a new default currency converts the rates of the transactions'
);

select throws_ok(
  $$ select public.save_space_currencies('10000000-0000-0000-0000-00000000000a',
       '[{"currency": "EUR", "rate": "1", "is_default": true},
         {"currency": "GBP", "rate": "1.17", "is_default": false}]') $$,
  '22023',
  null,
  'save_space_currencies: a new default currency with no rate for the old default currency is refused'
);

select throws_ok(
  $$ select tests.run_with_deferred_checks($q$
       update public.space_currencies set is_default = false
       where space_id = '10000000-0000-0000-0000-00000000000b'
     $q$) $$,
  '23514',
  null,
  'update.space_currencies: a direct write that leaves no default currency is refused'
);

-- save_alias

select throws_ok(
  $$ select public.save_alias(null, '10000000-0000-0000-0000-00000000000a', 'Empty', '{}') $$,
  '22023',
  null,
  'save_alias: an alias with no members is refused'
);

select lives_ok(
  $$ select tests.run_with_deferred_checks($q$
       select public.save_alias('30000000-0000-0000-0000-00000000000a',
         '10000000-0000-0000-0000-00000000000a', 'The Obamas',
         array['20000000-0000-0000-0000-0000000000a2']::uuid[])
     $q$) $$,
  'save_alias: renames an alias and replaces its members'
);

select results_eq(
  $$ select member_id from public.alias_members
     where alias_id = '30000000-0000-0000-0000-00000000000a' $$,
  $$ values ('20000000-0000-0000-0000-0000000000a2'::uuid) $$,
  'save_alias: the alias has only the new members'
);

select throws_ok(
  $$ select tests.run_with_deferred_checks($q$
       delete from public.alias_members
       where alias_id = '30000000-0000-0000-0000-0000000000a2'
     $q$) $$,
  '23514',
  null,
  'delete.alias_members: a direct write that leaves an alias with no members is refused'
);

-- save_transaction

select throws_ok(
  $$ select public.save_transaction(null, '10000000-0000-0000-0000-00000000000a',
       'Lunch', null, 1000, 'EUR', null, '2026-11-02',
       '[]', '[{"member_id": "20000000-0000-0000-0000-0000000000a1"}]') $$,
  '22023',
  null,
  'save_transaction: an empty side is refused'
);

select lives_ok(
  $$ update public.members set archived_at = now()
     where id = '20000000-0000-0000-0000-0000000000a3' $$,
  'update.members: a user archives Donald'
);

select throws_ok(
  $$ select public.save_transaction(null, '10000000-0000-0000-0000-00000000000a',
       'Lunch', null, 1000, 'EUR', null, '2026-11-02',
       '[{"member_id": "20000000-0000-0000-0000-0000000000a3"}]',
       '[{"member_id": "20000000-0000-0000-0000-0000000000a1"}]') $$,
  '22023',
  null,
  'save_transaction: an archived member in a new transaction is refused'
);

select lives_ok(
  $$ select tests.run_with_deferred_checks($q$
       select public.save_transaction(null, '10000000-0000-0000-0000-00000000000a',
         'Lunch', null, 1000, 'EUR', null, '2026-11-02',
         '[{"alias_id": "30000000-0000-0000-0000-00000000000a"}, {"member_id": "20000000-0000-0000-0000-0000000000a1"}]',
         '[{"member_id": "20000000-0000-0000-0000-0000000000a1"}, {"member_id": "20000000-0000-0000-0000-0000000000a2"}]')
     $q$) $$,
  'save_transaction: a member on a side two times, directly and through an alias, is allowed'
);

select throws_ok(
  $$ select tests.run_with_deferred_checks($q$
       delete from public.transaction_parties
       where transaction_id = '40000000-0000-0000-0000-00000000000a'
         and side = 'paid_by'
     $q$) $$,
  '23514',
  null,
  'delete.transaction_parties: a direct write that leaves an empty side is refused'
);

-- Custom shares (PLAN.md, D6)

select lives_ok(
  $$ select tests.run_with_deferred_checks($q$
       select public.save_transaction(null, '10000000-0000-0000-0000-00000000000a',
         'Split lunch', null, 1000, 'EUR', null, '2026-11-03',
         '[{"member_id": "20000000-0000-0000-0000-0000000000a1"}]',
         '[{"member_id": "20000000-0000-0000-0000-0000000000a1", "share_minor": 400},
           {"alias_id": "30000000-0000-0000-0000-00000000000a", "share_minor": 600}]')
     $q$) $$,
  'save_transaction: custom shares that sum to the amount are allowed'
);

select results_eq(
  $$ select side::text, share_minor from public.transaction_parties
     join public.transactions on transactions.id = transaction_parties.transaction_id
     where transactions.title = 'Split lunch'
     order by side, share_minor nulls first $$,
  $$ values ('paid_by', null::bigint), ('paid_for', 400::bigint), ('paid_for', 600::bigint) $$,
  'save_transaction: stores the share of each party'
);

select throws_ok(
  $$ select tests.run_with_deferred_checks($q$
       select public.save_transaction(null, '10000000-0000-0000-0000-00000000000a',
         'Lunch', null, 1000, 'EUR', null, '2026-11-03',
         '[{"member_id": "20000000-0000-0000-0000-0000000000a1"}]',
         '[{"member_id": "20000000-0000-0000-0000-0000000000a1", "share_minor": 400},
           {"member_id": "20000000-0000-0000-0000-0000000000a2", "share_minor": 500}]')
     $q$) $$,
  '23514',
  null,
  'save_transaction: shares that do not sum to the amount are refused'
);

select throws_ok(
  $$ select tests.run_with_deferred_checks($q$
       select public.save_transaction(null, '10000000-0000-0000-0000-00000000000a',
         'Lunch', null, 1000, 'EUR', null, '2026-11-03',
         '[{"member_id": "20000000-0000-0000-0000-0000000000a1"}]',
         '[{"member_id": "20000000-0000-0000-0000-0000000000a1", "share_minor": 1000},
           {"member_id": "20000000-0000-0000-0000-0000000000a2"}]')
     $q$) $$,
  '23514',
  null,
  'save_transaction: a side with a share on some parties only is refused'
);

select throws_ok(
  $$ select tests.run_with_deferred_checks($q$
       select public.save_transaction(null, '10000000-0000-0000-0000-00000000000a',
         'Lunch', null, 1000, 'EUR', null, '2026-11-03',
         '[{"member_id": "20000000-0000-0000-0000-0000000000a1"}]',
         '[{"member_id": "20000000-0000-0000-0000-0000000000a1", "share_minor": 1000},
           {"member_id": "20000000-0000-0000-0000-0000000000a2", "share_minor": 0}]')
     $q$) $$,
  '23514',
  null,
  'save_transaction: a share of zero is refused'
);

select throws_ok(
  $$ select tests.run_with_deferred_checks($q$
       update public.transactions set amount_minor = 2000 where title = 'Split lunch'
     $q$) $$,
  '23514',
  null,
  'update.transactions: a new amount that does not agree with the shares is refused'
);

select lives_ok(
  $$ select tests.run_with_deferred_checks($q$
       update public.transactions set amount_minor = 5000
       where id = '40000000-0000-0000-0000-00000000000a'
     $q$) $$,
  'update.transactions: a new amount of a transaction with equal parts is allowed'
);

select throws_ok(
  $$ select public.save_transaction('40000000-0000-0000-0000-00000000000a',
       '10000000-0000-0000-0000-00000000000b', 'Dinner', null, 4000, 'EUR', null, '2026-11-01',
       '[{"member_id": "20000000-0000-0000-0000-0000000000b1"}]',
       '[{"member_id": "20000000-0000-0000-0000-0000000000b1"}]') $$,
  'P0002',
  null,
  'save_transaction: a transaction of a different space is refused'
);

-- import_transactions

select lives_ok(
  $$ select tests.run_with_deferred_checks($q$
       select public.import_transactions('10000000-0000-0000-0000-00000000000a',
         '[{"currency": "THB", "rate": "0.02625"}, {"currency": "EUR", "rate": "3"}]',
         '[{"title": "Imported dinner", "description": "Imported from Splid",
            "amount_minor": 3000, "currency": "EUR", "transaction_date": "2025-01-07",
            "paid_by": [{"member_id": "20000000-0000-0000-0000-0000000000a1", "alias_id": null, "share_minor": null}],
            "paid_for": [{"member_id": "20000000-0000-0000-0000-0000000000a1", "alias_id": null, "share_minor": 1000},
                         {"member_id": "20000000-0000-0000-0000-0000000000a2", "alias_id": null, "share_minor": 2000}]},
           {"title": "Imported boat", "description": null,
            "amount_minor": 370000, "currency": "THB", "rate": "0.026", "transaction_date": "2025-02-25",
            "paid_by": [{"member_id": "20000000-0000-0000-0000-0000000000a2", "alias_id": null, "share_minor": null}],
            "paid_for": [{"member_id": "20000000-0000-0000-0000-0000000000a1", "alias_id": null, "share_minor": null}]}]')
     $q$) $$,
  'import_transactions: imports transactions with a new currency'
);

select results_eq(
  $$ select currency, rate::text, is_default from public.space_currencies
     where space_id = '10000000-0000-0000-0000-00000000000a'
       and currency = 'THB' $$,
  $$ values ('THB', '0.02625000', false) $$,
  'import_transactions: adds a new currency'
);

select ok(
  (select rate <> 3 from public.space_currencies
   where space_id = '10000000-0000-0000-0000-00000000000a'
     and currency = 'EUR'),
  'import_transactions: keeps the rate of an existing currency'
);

select results_eq(
  $$ select title, rate::text from public.transactions
     where title like 'Imported %'
     order by title $$,
  $$ values ('Imported boat', '0.02600000'), ('Imported dinner', '1.08695652') $$,
  'import_transactions: keeps the rate of each row, or gives the rate of the space currency'
);

select results_eq(
  $$ select transactions.title, transaction_parties.side::text, transaction_parties.share_minor
     from public.transactions
     join public.transaction_parties on transaction_parties.transaction_id = transactions.id
     where transactions.title like 'Imported %'
     order by transactions.title, transaction_parties.side, transaction_parties.share_minor $$,
  $$ values ('Imported boat', 'paid_by', null::bigint), ('Imported boat', 'paid_for', null),
            ('Imported dinner', 'paid_by', null), ('Imported dinner', 'paid_for', 1000),
            ('Imported dinner', 'paid_for', 2000) $$,
  'import_transactions: saves each transaction with its parties and shares'
);

select throws_ok(
  $$ select public.import_transactions('10000000-0000-0000-0000-00000000000a', '[]',
       '[{"title": "Bad import", "description": null, "amount_minor": 100,
          "currency": "EUR", "transaction_date": "2025-01-07",
          "paid_by": [], "paid_for": [{"member_id": "20000000-0000-0000-0000-0000000000a1"}]}]') $$,
  '22023',
  null,
  'import_transactions: a transaction with an empty side is refused'
);

select throws_ok(
  $$ select public.import_transactions('10000000-0000-0000-0000-00000000000a', '{}', '[]') $$,
  '22023',
  null,
  'import_transactions: a value that is not an array is refused'
);

select * from finish();

rollback;
