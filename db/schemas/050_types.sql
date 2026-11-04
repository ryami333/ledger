-- The side of a party in a transaction (PLAN.md, glossary): paid_by holds the
-- payers, and paid_for holds the parties that the payment is for.
do $$
begin
  create type "public"."transaction_side" as enum ('paid_by', 'paid_for');
exception
  when duplicate_object then null;
end
$$;
