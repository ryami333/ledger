#!/bin/sh
# Runs the pgTAP tests of db/tests in a new database, ledger_test,
# in the local stack (compose.yaml). The data of the database postgres stays.
# The script applies the migrations first, thus it also tests them. It
# starts the database of the local stack if it does not run.
set -eu

docker compose up -d --wait db

psql() {
  docker compose exec -T db psql -U postgres -v ON_ERROR_STOP=1 --quiet "$@"
}

psql -d postgres \
  -c "drop database if exists ledger_test with (force)" \
  -c "create database ledger_test"

DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54332/ledger_test \
  node --env-file-if-exists=.env src/scripts/migrateDatabase.ts

# The tests find the pgTAP functions in the schema extensions, also as the
# roles of PostgREST.
psql -d ledger_test \
  -c "create schema extensions" \
  -c "grant usage on schema extensions to anon, authenticated" \
  -c "create extension pgtap with schema extensions" \
  -c "alter database ledger_test set search_path = \"\$user\", public, extensions"

docker compose exec -T db sh -c \
  'pg_prove -U postgres -d ledger_test /tests/database/*.test.sql'
