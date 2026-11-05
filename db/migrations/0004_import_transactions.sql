-- Adds the function import_transactions for the CSV import of the settings
-- page. It adds the missing space currencies, then calls save_transaction
-- for each row, in one database transaction (PLAN.md, D9).
--
-- Safe to run two times: the function is replaced, and a grant and a revoke
-- are safe on a second run.
--
-- Rollback: drop the function import_transactions(uuid, jsonb, jsonb).

set local check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.import_transactions(p_space_id uuid, p_currencies jsonb, p_transactions jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_item jsonb;
  v_count integer := 0;
begin
  if pg_catalog.jsonb_typeof(p_currencies) is distinct from 'array'
    or pg_catalog.jsonb_typeof(p_transactions) is distinct from 'array'
  then
    raise exception 'import_transactions needs two jsonb arrays'
      using errcode = '22023';
  end if;

  if not exists (select from public.spaces where spaces.id = p_space_id) then
    raise exception 'The space % does not exist', p_space_id
      using errcode = 'P0002';
  end if;

  insert into public.space_currencies (space_id, currency, rate, is_default)
  select
    p_space_id,
    item ->> 'currency',
    (item ->> 'rate')::numeric(18, 8),
    false
  from pg_catalog.jsonb_array_elements(p_currencies) as item
  on conflict (space_id, currency) do nothing;

  for v_item in
    select item from pg_catalog.jsonb_array_elements(p_transactions) as item
  loop
    perform public.save_transaction(
      null,
      p_space_id,
      v_item ->> 'title',
      v_item ->> 'description',
      (v_item ->> 'amount_minor')::bigint,
      v_item ->> 'currency',
      (v_item ->> 'transaction_date')::date,
      v_item -> 'paid_by',
      v_item -> 'paid_for'
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$function$;

REVOKE ALL ON FUNCTION "public"."import_transactions"(uuid, jsonb, jsonb) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."import_transactions"(uuid, jsonb, jsonb) TO "authenticated";
