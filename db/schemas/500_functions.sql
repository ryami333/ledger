-- Returns the ID of the current user: the claim sub of the JWT that the web
-- app signs for PostgREST (PLAN.md, D3). It returns null for no JWT, or for a
-- JWT with no sub.
CREATE OR REPLACE FUNCTION "public"."current_user_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  select nullif(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub',
    ''
  )::uuid;
$$;

-- Sets created_at on INSERT and keeps it on UPDATE. The column default applies
-- only when the client sends no value. Thus no caller can send or change
-- created_at.
CREATE OR REPLACE FUNCTION "public"."set_created_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  if tg_op = 'UPDATE' then
    new.created_at := old.created_at;
  else
    new.created_at := now();
  end if;

  return new;
end;
$$;

-- Sets updated_at on INSERT and on UPDATE.
CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Sets a "created by" column, for example created_by, to the current user on
-- INSERT. An UPDATE keeps the old value. The trigger gives the column name as
-- its argument.
--
-- Only a request of the role authenticated gets the current user. A direct
-- database connection (the seed, a migration) keeps the value that it sends.
CREATE OR REPLACE FUNCTION "public"."set_actor_on_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  v_column_name text := tg_argv[0];
begin
  -- jsonb_populate_record ignores a key that is not a column. Without this
  -- check, a wrong column name in a trigger does nothing and gives no error.
  if not (to_jsonb(new) ? v_column_name) then
    raise exception 'set_actor_on_insert: table % has no column %',
      tg_table_name, v_column_name
      using errcode = '42703';
  end if;

  -- The column records who created the row. No caller can move it to a
  -- different user. A null must pass, because each actor foreign key uses
  -- ON DELETE SET NULL.
  if tg_op = 'UPDATE' then
    if (to_jsonb(new) -> v_column_name) = 'null'::jsonb then
      return new;
    end if;

    return pg_catalog.jsonb_populate_record(
      new,
      pg_catalog.jsonb_build_object(v_column_name, to_jsonb(old) -> v_column_name)
    );
  end if;

  if current_user = 'authenticated' then
    return pg_catalog.jsonb_populate_record(
      new,
      pg_catalog.jsonb_build_object(v_column_name, public.current_user_id())
    );
  end if;

  return new;
end;
$$;

-- Sets an "updated by" column, for example updated_by, to the current user on
-- INSERT and on UPDATE. The trigger gives the column name as its argument.
--
-- Only a request of the role authenticated gets the current user. A direct
-- database connection keeps the value that it sends. ON DELETE SET NULL of the
-- actor foreign key runs as the owner, thus it also keeps its null.
CREATE OR REPLACE FUNCTION "public"."set_actor_on_write"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  v_column_name text := tg_argv[0];
begin
  if not (to_jsonb(new) ? v_column_name) then
    raise exception 'set_actor_on_write: table % has no column %',
      tg_table_name, v_column_name
      using errcode = '42703';
  end if;

  if current_user = 'authenticated' then
    return pg_catalog.jsonb_populate_record(
      new,
      pg_catalog.jsonb_build_object(v_column_name, public.current_user_id())
    );
  end if;

  return new;
end;
$$;

-- Makes sure that the space of the row has exactly one default currency. The
-- deferred constraint triggers space_currencies_check_default and
-- spaces_check_default_currency call it at the end of the database
-- transaction. Thus save_space_currencies can change the default currency in
-- more than one statement.
CREATE OR REPLACE FUNCTION "public"."check_space_default_currency"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  v_space_id uuid;
  v_default_count integer;
begin
  if tg_table_name = 'spaces' then
    v_space_id := new.id;
  elsif tg_op = 'DELETE' then
    v_space_id := old.space_id;
  else
    v_space_id := new.space_id;
  end if;

  -- A delete of the space also deletes its currencies.
  if not exists (select from public.spaces where spaces.id = v_space_id) then
    return null;
  end if;

  select count(*) into v_default_count
  from public.space_currencies
  where space_currencies.space_id = v_space_id
    and space_currencies.is_default;

  if v_default_count <> 1 then
    raise exception 'The space % must have exactly one default currency', v_space_id
      using errcode = '23514';
  end if;

  return null;
end;
$$;

-- Makes sure that the alias of the row has one or more members (PLAN.md, D7).
-- The deferred constraint triggers call it at the end of the database
-- transaction. Thus save_alias can replace the members.
CREATE OR REPLACE FUNCTION "public"."check_alias_members"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  v_alias_id uuid;
begin
  if tg_table_name = 'aliases' then
    v_alias_id := new.id;
  elsif tg_op = 'DELETE' then
    v_alias_id := old.alias_id;
  else
    v_alias_id := new.alias_id;
  end if;

  -- A delete of the alias also deletes its members.
  if not exists (select from public.aliases where aliases.id = v_alias_id) then
    return null;
  end if;

  if not exists (
    select from public.alias_members where alias_members.alias_id = v_alias_id
  ) then
    raise exception 'The alias % must have one or more members', v_alias_id
      using errcode = '23514';
  end if;

  return null;
end;
$$;

-- Makes sure that each side of the transaction of the row has one or more
-- parties. The deferred constraint triggers call it at the end of the database
-- transaction. Thus save_transaction can replace the parties.
CREATE OR REPLACE FUNCTION "public"."check_transaction_sides"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
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

  return null;
end;
$$;

-- Inserts a space, its default currency with the rate 1, and its first
-- members (PLAN.md, D9). Returns the ID of the space.
CREATE OR REPLACE FUNCTION "public"."create_space"("p_title" "text", "p_description" "text", "p_default_currency" "text", "p_member_names" "text"[]) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY INVOKER
    SET "search_path" TO ''
    AS $$
declare
  v_space_id uuid;
begin
  insert into public.spaces (title, description)
  values (p_title, p_description)
  returning id into v_space_id;

  insert into public.space_currencies (space_id, currency, rate, is_default)
  values (v_space_id, p_default_currency, 1, true);

  insert into public.members (space_id, name)
  select v_space_id, member_name
  from unnest(coalesce(p_member_names, '{}')) as member_name;

  return v_space_id;
end;
$$;

-- Replaces the currencies of a space (PLAN.md, D5). p_currencies is a jsonb
-- array of { "currency": "USD", "rate": "0.92", "is_default": false }. Give
-- the rate as a string, so it keeps all its digits. Returns the ID of the
-- space.
--
-- It refuses a list with no default currency, or with more than one. It
-- removes the currencies that are not in the list. A currency in use cannot
-- be removed: the foreign key of transactions refuses the delete.
CREATE OR REPLACE FUNCTION "public"."save_space_currencies"("p_space_id" "uuid", "p_currencies" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY INVOKER
    SET "search_path" TO ''
    AS $$
declare
  v_default_count integer;
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
$$;

-- Inserts or updates an alias, and replaces its members (PLAN.md, D9). Give
-- null as p_alias_id for a new alias. Returns the ID of the alias. The
-- composite foreign keys refuse a member of a different space.
CREATE OR REPLACE FUNCTION "public"."save_alias"("p_alias_id" "uuid", "p_space_id" "uuid", "p_name" "text", "p_member_ids" "uuid"[]) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY INVOKER
    SET "search_path" TO ''
    AS $$
declare
  v_alias_id uuid;
begin
  if coalesce(pg_catalog.cardinality(p_member_ids), 0) = 0 then
    raise exception 'save_alias needs one or more members'
      using errcode = '22023';
  end if;

  if p_alias_id is null then
    insert into public.aliases (space_id, name)
    values (p_space_id, p_name)
    returning id into v_alias_id;
  else
    update public.aliases
    set name = p_name
    where aliases.id = p_alias_id
      and aliases.space_id = p_space_id
    returning id into v_alias_id;

    if v_alias_id is null then
      raise exception 'The alias % does not exist in the space %', p_alias_id, p_space_id
        using errcode = 'P0002';
    end if;
  end if;

  delete from public.alias_members
  where alias_members.alias_id = v_alias_id
    and alias_members.member_id <> all (p_member_ids);

  insert into public.alias_members (alias_id, member_id, space_id)
  select distinct v_alias_id, member_id, p_space_id
  from unnest(p_member_ids) as member_id
  on conflict (alias_id, member_id) do nothing;

  return v_alias_id;
end;
$$;

-- Inserts or updates a transaction, and replaces its parties (PLAN.md, D9).
-- Give null as p_transaction_id for a new transaction. p_paid_by and
-- p_paid_to are jsonb arrays of { "member_id": ... } or { "alias_id": ... }.
-- Returns the ID of the transaction.
--
-- It refuses an empty side, and an archived member in a new transaction. The
-- composite foreign keys refuse a party of a different space and a currency
-- that is not a space currency.
CREATE OR REPLACE FUNCTION "public"."save_transaction"("p_transaction_id" "uuid", "p_space_id" "uuid", "p_title" "text", "p_description" "text", "p_amount_minor" bigint, "p_currency" "text", "p_transaction_date" "date", "p_paid_by" "jsonb", "p_paid_to" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY INVOKER
    SET "search_path" TO ''
    AS $$
declare
  v_transaction_id uuid;
begin
  if pg_catalog.jsonb_typeof(p_paid_by) is distinct from 'array'
    or pg_catalog.jsonb_array_length(p_paid_by) = 0
    or pg_catalog.jsonb_typeof(p_paid_to) is distinct from 'array'
    or pg_catalog.jsonb_array_length(p_paid_to) = 0
  then
    raise exception 'save_transaction needs one or more parties on each side'
      using errcode = '22023';
  end if;

  if p_transaction_id is null and exists (
    select
    from pg_catalog.jsonb_array_elements(p_paid_by || p_paid_to) as item
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
    select 'paid_to'::public.transaction_side as side, item
    from pg_catalog.jsonb_array_elements(p_paid_to) as item
  ) as parties;

  return v_transaction_id;
end;
$$;
