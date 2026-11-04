-- The side of a party in a transaction (PLAN.md, glossary): paid_by holds the
-- payers, and paid_to holds the payees, who got the value.
do $$
begin
  create type "public"."transaction_side" as enum ('paid_by', 'paid_to');
exception
  when duplicate_object then null;
end
$$;
