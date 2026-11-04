-- Renames the side paid_to to paid_for: the enum value of transaction_side,
-- and the parameter p_paid_to of save_transaction (PLAN.md, glossary).
--
-- A rename of the enum value keeps the rows of transaction_parties. Postgres
-- cannot rename a function parameter, thus the migration drops the function
-- and creates it again, with its grants.
--
-- Safe to run two times: the do block renames the value only when paid_to
-- exists, and the function and the grants are made again.
--
-- Rollback: drop save_transaction, rename the enum value paid_for to paid_to,
-- then create save_transaction and its grants again as in 0001_baseline.sql.

do $$
begin
  if exists (
    select
    from pg_catalog.pg_enum
    join pg_catalog.pg_type on pg_type.oid = pg_enum.enumtypid
    join pg_catalog.pg_namespace on pg_namespace.oid = pg_type.typnamespace
    where pg_namespace.nspname = 'public'
      and pg_type.typname = 'transaction_side'
      and pg_enum.enumlabel = 'paid_to'
  ) then
    alter type "public"."transaction_side" rename value 'paid_to' to 'paid_for';
  end if;
end
$$;

drop function if exists "public"."save_transaction"("uuid", "uuid", "text", "text", bigint, "text", "date", "jsonb", "jsonb");

CREATE OR REPLACE FUNCTION "public"."save_transaction"("p_transaction_id" "uuid", "p_space_id" "uuid", "p_title" "text", "p_description" "text", "p_amount_minor" bigint, "p_currency" "text", "p_transaction_date" "date", "p_paid_by" "jsonb", "p_paid_for" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY INVOKER
    SET "search_path" TO ''
    AS $$
declare
  v_transaction_id uuid;
begin
  if pg_catalog.jsonb_typeof(p_paid_by) is distinct from 'array'
    or pg_catalog.jsonb_array_length(p_paid_by) = 0
    or pg_catalog.jsonb_typeof(p_paid_for) is distinct from 'array'
    or pg_catalog.jsonb_array_length(p_paid_for) = 0
  then
    raise exception 'save_transaction needs one or more parties on each side'
      using errcode = '22023';
  end if;

  if p_transaction_id is null and exists (
    select
    from pg_catalog.jsonb_array_elements(p_paid_by || p_paid_for) as item
    join public.members on members.id = (item ->> 'member_id')::uuid
    where members.archived_at is not null
  ) then
    raise exception 'save_transaction refuses an archived member in a new transaction'
      using errcode = '22023';
  end if;

  if p_transaction_id is null then
    insert into public.transactions (space_id, title, description, amount_minor, currency, transaction_date)
    values (p_space_id, p_title, p_description, p_amount_minor, p_currency, p_transaction_date)
    returning id into v_transaction_id;
  else
    update public.transactions
    set title = p_title,
        description = p_description,
        amount_minor = p_amount_minor,
        currency = p_currency,
        transaction_date = p_transaction_date
    where transactions.id = p_transaction_id
      and transactions.space_id = p_space_id
    returning id into v_transaction_id;

    if v_transaction_id is null then
      raise exception 'The transaction % does not exist in the space %', p_transaction_id, p_space_id
        using errcode = 'P0002';
    end if;

    delete from public.transaction_parties
    where transaction_parties.transaction_id = v_transaction_id;
  end if;

  insert into public.transaction_parties (transaction_id, space_id, side, member_id, alias_id)
  select
    v_transaction_id,
    p_space_id,
    parties.side,
    (parties.item ->> 'member_id')::uuid,
    (parties.item ->> 'alias_id')::uuid
  from (
    select 'paid_by'::public.transaction_side as side, item
    from pg_catalog.jsonb_array_elements(p_paid_by) as item
    union all
    select 'paid_for'::public.transaction_side as side, item
    from pg_catalog.jsonb_array_elements(p_paid_for) as item
  ) as parties;

  return v_transaction_id;
end;
$$;

revoke execute on function "public"."save_transaction"("uuid", "uuid", "text", "text", bigint, "text", "date", "jsonb", "jsonb") from public, anon;
grant execute on function "public"."save_transaction"("uuid", "uuid", "text", "text", bigint, "text", "date", "jsonb", "jsonb") to authenticated;
