-- Checks current_user_id. The actor triggers call it. It reads the claim sub
-- of the JWT that the web app signs for PostgREST.

begin;

\ir helpers.psql
\ir fixtures.psql

select plan(3);

select tests.authenticate_as('00000000-0000-0000-0000-00000000000a');

select is(
  public.current_user_id(),
  '00000000-0000-0000-0000-00000000000a'::uuid,
  'current_user_id: the sub of the JWT'
);

select tests.authenticate_as_anon();

select throws_ok(
  'select public.current_user_id()',
  '42501',
  null,
  'current_user_id: anon has no EXECUTE'
);

select tests.clear_authentication();

select is(
  public.current_user_id(),
  null,
  'current_user_id: null when request.jwt.claims is empty'
);

select * from finish();

rollback;
