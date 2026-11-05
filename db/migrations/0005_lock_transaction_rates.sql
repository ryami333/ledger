-- Locks the rate of each transaction at its save (PLAN.md, D5). A new
-- column transactions.rate holds the rate. A later change of a space currency
-- does not change it. save_transaction gets the new argument p_rate.
-- save_space_currencies converts the rates of the transactions on a change of
-- the default currency.
--
-- The backfill copies the current rate of the space currency to each old
-- transaction. It disables transactions_set_updated_at, so that updated_at
-- keeps its old value. It needs the earlier migrations in the same database
-- transaction to have no queued writes on transactions.
--
-- Safe to run two times: the drop and the column use "if exists" and "if not
-- exists", the backfill finds no row after the first run, the constraint is
-- dropped first, and the functions are replaced.
--
-- Rollback: drop the constraint transactions_rate_check and the column
-- transactions.rate. Drop save_transaction(uuid, uuid, text, text, bigint,
-- text, text, date, jsonb, jsonb). Create save_transaction(uuid, uuid, text,
-- text, bigint, text, date, jsonb, jsonb) again as in
-- 0003_custom_party_shares.sql, with its grants. Create save_space_currencies
-- again as in 0001_baseline.sql. Create import_transactions again as in
-- 0004_import_transactions.sql.

set local check_function_bodies = off;

DROP FUNCTION IF EXISTS "public"."save_transaction"(uuid, uuid, text, text, bigint, text, date, jsonb, jsonb);

ALTER TABLE "public"."transactions" ADD COLUMN IF NOT EXISTS "rate" numeric(18,8);

ALTER TABLE "public"."transactions" DISABLE TRIGGER "transactions_set_updated_at";

UPDATE "public"."transactions"
SET "rate" = "space_currencies"."rate"
FROM "public"."space_currencies"
WHERE "space_currencies"."space_id" = "transactions"."space_id"
  AND "space_currencies"."currency" = "transactions"."currency"
  AND "transactions"."rate" IS NULL;

-- The update queues the deferred check transactions_check_sides. An ALTER
-- TABLE refuses a table with queued trigger events. Thus run the check now.
SET CONSTRAINTS "public"."transactions_check_sides" IMMEDIATE;
SET CONSTRAINTS "public"."transactions_check_sides" DEFERRED;

ALTER TABLE "public"."transactions" ENABLE TRIGGER "transactions_set_updated_at";

ALTER TABLE "public"."transactions" ALTER COLUMN "rate" SET NOT NULL;

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
      v_item ->> 'rate',
      (v_item ->> 'transaction_date')::date,
      v_item -> 'paid_by',
      v_item -> 'paid_for'
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$function$;

CREATE OR REPLACE FUNCTION public.save_space_currencies(p_space_id uuid, p_currencies jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_default_count integer;
  v_old_default text;
  v_new_default text;
  v_conversion_rate numeric(18, 8);
begin
  if pg_catalog.jsonb_typeof(p_currencies) is distinct from 'array' then
    raise exception 'save_space_currencies needs a jsonb array'
      using errcode = '22023';
  end if;

  select count(*) into v_default_count
  from pg_catalog.jsonb_array_elements(p_currencies) as item
  where (item ->> 'is_default')::boolean;

  if v_default_count <> 1 then
    raise exception 'save_space_currencies needs exactly one default currency'
      using errcode = '22023';
  end if;

  if not exists (select from public.spaces where spaces.id = p_space_id) then
    raise exception 'The space % does not exist', p_space_id
      using errcode = 'P0002';
  end if;

  select space_currencies.currency into v_old_default
  from public.space_currencies
  where space_currencies.space_id = p_space_id
    and space_currencies.is_default;

  select item ->> 'currency' into v_new_default
  from pg_catalog.jsonb_array_elements(p_currencies) as item
  where (item ->> 'is_default')::boolean;

  if v_old_default is distinct from v_new_default then
    select (item ->> 'rate')::numeric(18, 8) into v_conversion_rate
    from pg_catalog.jsonb_array_elements(p_currencies) as item
    where item ->> 'currency' = v_old_default;

    if v_conversion_rate is null and exists (
      select from public.transactions
      where transactions.space_id = p_space_id
        and transactions.currency <> v_new_default
    ) then
      raise exception 'save_space_currencies needs the old default currency % to convert the rates of the transactions', v_old_default
        using errcode = '22023';
    end if;

    update public.transactions
    set rate = case
      when transactions.currency = v_new_default then 1
      else transactions.rate * v_conversion_rate
    end
    where transactions.space_id = p_space_id;
  end if;

  delete from public.space_currencies
  where space_currencies.space_id = p_space_id
    and space_currencies.currency not in (
      select item ->> 'currency'
      from pg_catalog.jsonb_array_elements(p_currencies) as item
    );

  -- Clear the old default first. The unique index allows only one default
  -- currency for each space at each moment.
  update public.space_currencies
  set is_default = false
  where space_currencies.space_id = p_space_id
    and space_currencies.is_default;

  insert into public.space_currencies (space_id, currency, rate, is_default)
  select
    p_space_id,
    item ->> 'currency',
    (item ->> 'rate')::numeric(18, 8),
    (item ->> 'is_default')::boolean
  from pg_catalog.jsonb_array_elements(p_currencies) as item
  on conflict (space_id, currency) do update
  set rate = excluded.rate,
      is_default = excluded.is_default;

  return p_space_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.save_transaction(p_transaction_id uuid, p_space_id uuid, p_title text, p_description text, p_amount_minor bigint, p_currency text, p_rate text, p_transaction_date date, p_paid_by jsonb, p_paid_for jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_transaction_id uuid;
  v_rate numeric(18, 8);
  v_is_default boolean;
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

  -- A currency that is not a space currency gives null here. The foreign key
  -- of the insert or the update then refuses it.
  select space_currencies.rate, space_currencies.is_default
  into v_rate, v_is_default
  from public.space_currencies
  where space_currencies.space_id = p_space_id
    and space_currencies.currency = p_currency;

  if p_rate is not null then
    v_rate := p_rate::numeric(18, 8);
  end if;

  if v_is_default and v_rate <> 1 then
    raise exception 'save_transaction needs the rate 1 for the default currency %', p_currency
      using errcode = '22023';
  end if;

  if p_transaction_id is null then
    insert into public.transactions (space_id, title, description, amount_minor, currency, rate, transaction_date)
    values (p_space_id, p_title, p_description, p_amount_minor, p_currency, coalesce(v_rate, 1), p_transaction_date)
    returning id into v_transaction_id;
  else
    update public.transactions
    set title = p_title,
        description = p_description,
        amount_minor = p_amount_minor,
        currency = p_currency,
        rate = coalesce(v_rate, 1),
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

  insert into public.transaction_parties (transaction_id, space_id, side, member_id, alias_id, share_minor)
  select
    v_transaction_id,
    p_space_id,
    parties.side,
    (parties.item ->> 'member_id')::uuid,
    (parties.item ->> 'alias_id')::uuid,
    (parties.item ->> 'share_minor')::bigint
  from (
    select 'paid_by'::public.transaction_side as side, item
    from pg_catalog.jsonb_array_elements(p_paid_by) as item
    union all
    select 'paid_for'::public.transaction_side as side, item
    from pg_catalog.jsonb_array_elements(p_paid_for) as item
  ) as parties;

  return v_transaction_id;
end;
$function$;

ALTER TABLE "public"."transactions" DROP CONSTRAINT IF EXISTS "transactions_rate_check";

ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_rate_check" CHECK ((rate > (0)::numeric));

REVOKE ALL ON FUNCTION "public"."save_transaction"(uuid, uuid, text, text, bigint, text, text, date, jsonb, jsonb) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."save_transaction"(uuid, uuid, text, text, bigint, text, text, date, jsonb, jsonb) TO "authenticated";

REVOKE ALL ("rate") ON TABLE "public"."transactions" FROM "authenticated";

GRANT INSERT ("rate"), UPDATE ("rate") ON TABLE "public"."transactions" TO "authenticated";
