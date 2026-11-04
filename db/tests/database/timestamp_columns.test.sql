-- Checks the triggers that set created_at and updated_at. The column default
-- applies only when the client sends no value. Thus the triggers must stop a
-- write from sending or changing a timestamp.
--
-- now() is the start time of the transaction, thus it is the same value in
-- the trigger and in the test.

begin;

\ir helpers.psql
\ir fixtures.psql

select plan(5);

-- Each table with a created_at or updated_at column has the trigger. A new
-- table with no trigger fails here. The mask 23 is ROW (1) + BEFORE (2) +
-- INSERT (4) + UPDATE (16), see pg_trigger.tgtype.
select is_empty(
  $$ select columns.table_name::text || '.' || columns.column_name::text
     from information_schema.columns
     join information_schema.tables
       on tables.table_schema = columns.table_schema
      and tables.table_name = columns.table_name
     where columns.table_schema = 'public'
       and columns.column_name in ('created_at', 'updated_at')
       and tables.table_type = 'BASE TABLE'
       and not exists (
         select 1
         from pg_trigger
         join pg_proc on pg_proc.oid = pg_trigger.tgfoid
         where pg_trigger.tgrelid = format('public.%I', columns.table_name)::regclass
           and pg_proc.pronamespace = 'public'::regnamespace
           and pg_proc.proname = 'set_' || columns.column_name
           and (pg_trigger.tgtype & 23) = 23
       ) $$,
  'Each table with created_at or updated_at runs its trigger before insert and update'
);

select tests.authenticate_as('00000000-0000-0000-0000-00000000000a');

-- The table has no column grant for the timestamps, thus a user cannot send
-- them. The direct connection of the seed can, and the trigger still wins.
select throws_ok(
  $$ update public.members set created_at = '2000-01-01'
     where id = '20000000-0000-0000-0000-0000000000a1' $$,
  '42501',
  null,
  'update.members: a user cannot send created_at'
);

select isnt_empty(
  $$ update public.members set name = 'Barack H.'
     where id = '20000000-0000-0000-0000-0000000000a1'
     returning id $$,
  'update.members: the update of a user reaches the row'
);

select tests.clear_authentication();

update public.members
set created_at = '2000-01-01', updated_at = '2000-01-01'
where id = '20000000-0000-0000-0000-0000000000a2';

insert into public.members (id, space_id, name, created_at, updated_at)
values ('20000000-0000-0000-0000-0000000000a4', '10000000-0000-0000-0000-00000000000a',
        'Melania', '2000-01-01', '2000-01-01');

select is(
  (select array[created_at, updated_at] from public.members
   where id = '20000000-0000-0000-0000-0000000000a4'),
  array[now(), now()],
  'insert.members: created_at and updated_at are now(), not the values that the client sent'
);

select is(
  (select updated_at from public.members
   where id = '20000000-0000-0000-0000-0000000000a2'),
  now(),
  'update.members: updated_at is now(), not the value that the client sent'
);

select * from finish();

rollback;
