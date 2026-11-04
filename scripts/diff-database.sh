#!/bin/sh
# Writes a migration from the schema files: yarn db:diff <name> [--allow-drops]
#
# The script makes two new databases in the local stack (compose.yaml):
# diff_current with the migrations, and diff_desired with the files of
# db/schemas. pg-delta compares them and writes the statements to
# db/migrations/<NNNN>_<name>.sql. Review the file before the commit.
set -eu

name=${1:?"Usage: yarn db:diff <name> [--allow-drops]"}
shift
case "$name" in
  *[!a-z0-9_]*) echo "Use only a-z, 0-9, and _ in the name." >&2; exit 2 ;;
esac

admin_url=postgresql://postgres:postgres@127.0.0.1:54332
plan_dir=$(mktemp -d)
plan_file=$plan_dir/plan.json
trap 'rm -rf "$plan_dir"' EXIT

psql() {
  docker compose exec -T -e PGOPTIONS="-c client_min_messages=warning" db psql -U postgres -v ON_ERROR_STOP=1 --quiet "$@"
}

for database in diff_current diff_desired; do
  psql -d postgres \
    -c "drop database if exists $database with (force)" \
    -c "create database $database"
done

DATABASE_URL=$admin_url/diff_current \
  node --env-file-if-exists=.env src/scripts/migrateDatabase.ts >/dev/null
# The schema files do not hold the table of the migration script.
psql -d diff_current -c "drop schema migrations cascade"

cat db/schemas/*.sql | psql -d diff_desired

last_version=$(ls db/migrations | sed -n 's/^\([0-9]*\)_.*/\1/p' | sort -n | tail -1)
version=$(printf "%04d" "$(expr "${last_version:-0}" + 1)")
base=db/migrations/${version}_$name

yarn pgdelta plan \
  --source "$admin_url/diff_current" \
  --desired "$admin_url/diff_desired" \
  --out "$plan_file"

# Exit code 3 means that the schema files and the migrations are the same.
status=0
yarn pgdelta render --plan "$plan_file" --out "$base.sql" "$@" || status=$?
if [ "$status" -eq 3 ]; then
  echo "No change: the migrations give the schema of db/schemas."
  exit 0
fi
exit "$status"
