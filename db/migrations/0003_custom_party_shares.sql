-- Adds the custom share of a party (PLAN.md, D6): the column share_minor of
-- transaction_parties, with its check and its insert grant. save_transaction
-- stores the share. check_transaction_sides refuses a side with shares on
-- some parties only, or with shares that do not sum to the amount.
--
-- The constraint triggers now also run on an insert of a party and on an
-- update of a transaction. Postgres cannot replace a constraint trigger, thus
-- the migration drops each trigger and creates it again.
--
-- Safe to run two times: the drops and the column use "if exists" and
-- "if not exists", the check is dropped first, and the functions are
-- replaced.
--
-- Rollback: drop the triggers transactions_check_sides and
-- transaction_parties_check_sides. Create check_transaction_sides,
-- save_transaction, and the two triggers again as in 0001_baseline.sql. Then
-- drop the column share_minor of transaction_parties.

set local check_function_bodies = off;

DROP TRIGGER IF EXISTS "transaction_parties_check_sides" ON "public"."transaction_parties";

DROP TRIGGER IF EXISTS "transactions_check_sides" ON "public"."transactions";

ALTER TABLE "public"."transaction_parties" ADD COLUMN IF NOT EXISTS "share_minor" bigint;

CREATE OR REPLACE FUNCTION public.check_transaction_sides()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_transaction_id uuid;
begin
  if tg_table_name = 'transactions' then
    v_transaction_id := new.id;
  elsif tg_op = 'DELETE' then
    v_transaction_id := old.transaction_id;
  else
    v_transaction_id := new.transaction_id;
  end if;

  -- A delete of the transaction also deletes its parties.
  if not exists (
    select from public.transactions where transactions.id = v_transaction_id
  ) then
    return null;
  end if;

  if (
    select count(distinct transaction_parties.side)
    from public.transaction_parties
    where transaction_parties.transaction_id = v_transaction_id
  ) <> 2 then
    raise exception 'The transaction % must have one or more parties on each side', v_transaction_id
      using errcode = '23514';
  end if;

  if exists (
    select
    from public.transaction_parties
    join public.transactions on transactions.id = transaction_parties.transaction_id
    where transaction_parties.transaction_id = v_transaction_id
    group by transaction_parties.side, transactions.amount_minor
    having count(transaction_parties.share_minor) not in (0, count(*))
      or (
        count(transaction_parties.share_minor) > 0
        and sum(transaction_parties.share_minor) <> transactions.amount_minor
      )
  ) then
    raise exception 'The shares of each side of the transaction % must be on all parties or on none, and sum to the amount', v_transaction_id
      using errcode = '23514';
  end if;

  return null;
end;
$function$;

CREATE OR REPLACE FUNCTION public.save_transaction(p_transaction_id uuid, p_space_id uuid, p_title text, p_description text, p_amount_minor bigint, p_currency text, p_transaction_date date, p_paid_by jsonb, p_paid_for jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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

ALTER TABLE "public"."transaction_parties" DROP CONSTRAINT IF EXISTS "transaction_parties_share_minor_check";

ALTER TABLE "public"."transaction_parties" ADD CONSTRAINT "transaction_parties_share_minor_check" CHECK ((share_minor > 0));

-- A second run drops the triggers again at the start, thus these creates do
-- not clash.
CREATE CONSTRAINT TRIGGER transaction_parties_check_sides AFTER INSERT OR DELETE OR UPDATE ON public.transaction_parties DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.check_transaction_sides();

CREATE CONSTRAINT TRIGGER transactions_check_sides AFTER INSERT OR UPDATE ON public.transactions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.check_transaction_sides();

REVOKE ALL ("share_minor") ON TABLE "public"."transaction_parties" FROM "authenticated";

GRANT INSERT ("share_minor") ON TABLE "public"."transaction_parties" TO "authenticated";
