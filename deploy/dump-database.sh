#!/bin/sh
# Writes one dump of the database to $BACKUP_DIR/ledger.dump (PLAN.md, D13).
# It runs in the service db-dump of compose.yaml. The service runs it each
# night. `make dump` runs it now.
#
# The dump has the custom format (pg_dump -Fc) and the schemas public,
# better_auth, and migrations. It replaces the last dump. Zerobyte keeps the
# history. README.md gives the restore steps.
set -eu

PGPASSWORD=$(cat "$POSTGRES_PASSWORD_FILE")
export PGPASSWORD

# Write to a temporary file first. A failed dump then keeps the last dump.
TEMPORARY_FILE="$BACKUP_DIR/ledger.dump.partial"
STARTED_AT=$(date -u +%s)
pg_dump --format=custom \
	--schema=public --schema=better_auth --schema=migrations \
	--file="$TEMPORARY_FILE"
mv "$TEMPORARY_FILE" "$BACKUP_DIR/ledger.dump"

echo "Database dump written: $BACKUP_DIR/ledger.dump," \
	"$(wc -c <"$BACKUP_DIR/ledger.dump") bytes," \
	"$(($(date -u +%s) - STARTED_AT)) s"
