-- Checks the triggers that set the actor columns created_by and updated_by
-- (PLAN.md, D3). Each table with an actor column has its trigger, and a user
-- cannot send a different user.

begin;

\ir helpers.psql
\ir fixtures.psql

select plan(7);

-- Each table with created_by runs set_actor_on_insert('created_by'), and each
-- table with updated_by runs set_actor_on_write('updated_by'), before insert
-- and update. The mask 23 is ROW + BEFORE + INSERT + UPDATE.
select is_empty(
  $$ select columns.table_name::text || '.' || columns.column_name::text
     from information_schema.columns
     join information_schema.tables
       on tables.table_schema = columns.table_schema
      and tables.table_name = columns.table_name
     where columns.table_schema = 'public'
       and columns.column_name in ('created_by', 'updated_by')
       and tables.table_type = 'BASE TABLE'
       and not exists (
         select 1
         from pg_trigger
         join pg_proc on pg_proc.oid = pg_trigger.tgfoid
         where pg_trigger.tgrelid = format('public.%I', columns.table_name)::regclass
           and pg_proc.pronamespace = 'public'::regnamespace
           and pg_proc.proname = case columns.column_name
             when 'created_by' then 'set_actor_on_insert'
             else 'set_actor_on_write'
           end
           and pg_trigger.tgnargs = 1
           and encode(pg_trigger.tgargs, 'escape') = columns.column_name || '\000'
           and (pg_trigger.tgtype & 23) = 23
       ) $$,
  'Each actor column has its trigger, with the column name as the argument'
);

select tests.authenticate_as('00000000-0000-0000-0000-00000000000a');

select lives_ok(
  $$ select public.create_space('Space of A', null, 'EUR', array['Barack']) $$,
  'create_space: user A makes a space'
);

select is(
  (select array[created_by, updated_by] from public.spaces where title = 'Space of A'),
  array['00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a']::uuid[],
  'insert.spaces: created_by and updated_by are user A'
);

select tests.authenticate_as('00000000-0000-0000-0000-00000000000b');

select isnt_empty(
  $$ update public.spaces set title = 'Space of A, renamed by B'
     where title = 'Space of A'
     returning id $$,
  'update.spaces: user B renames the space'
);

select is(
  (select array[created_by, updated_by] from public.spaces where title = 'Space of A, renamed by B'),
  array['00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b']::uuid[],
  'update.spaces: created_by stays user A, and updated_by is user B'
);

select lives_ok(
  $$ select public.save_transaction(
       '40000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a',
       'Dinner', null, 5000, 'USD', null, '2026-11-01',
       '[{"alias_id": "30000000-0000-0000-0000-00000000000a"}]',
       '[{"member_id": "20000000-0000-0000-0000-0000000000a1"}]') $$,
  'save_transaction: user B changes the transaction'
);

select is(
  (select updated_by from public.transactions where id = '40000000-0000-0000-0000-00000000000a'),
  '00000000-0000-0000-0000-00000000000b'::uuid,
  'update.transactions: updated_by is user B'
);

select * from finish();

rollback;
