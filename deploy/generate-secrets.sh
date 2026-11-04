#!/bin/sh
# Writes the Docker secrets of the stack, one file each in secrets/. Run it
# one time on the host, before the first `make up`:
#
#   ./generate-secrets.sh
#
# The script makes a random Postgres password, a random PostgREST JWT secret,
# and a random better-auth secret. PostgREST reads the Postgres password in
# its connection URI, thus postgrest_db_uri repeats it.
#
# The script does not overwrite a file. A new Postgres password does not
# change the roles of an existing database.
#
# Fill pocket_id_client_id and pocket_id_client_secret by hand.
set -eu

cd "$(dirname "$0")"
FILES="postgres_password postgrest_db_uri postgrest_jwt_secret
better_auth_secret pocket_id_client_id pocket_id_client_secret"
for NAME in $FILES; do
	if [ -e "secrets/$NAME" ]; then
		echo "secrets/$NAME exists. Move secrets/ away first." >&2
		exit 1
	fi
done

# Only the owner can open the folder. The files are readable by all, because
# the containers read them as other users (UID 1000, 70, and root). Compose
# mounts each file, thus the folder mode does not apply in a container.
mkdir -p secrets
chmod 700 secrets
umask 022

# Hex characters only, thus the values need no escape in the URI.
POSTGRES_PASSWORD=$(openssl rand -hex 32)

printf '%s\n' "$POSTGRES_PASSWORD" >secrets/postgres_password
printf 'postgres://authenticator:%s@db:5432/postgres\n' "$POSTGRES_PASSWORD" \
	>secrets/postgrest_db_uri
openssl rand -hex 32 >secrets/postgrest_jwt_secret
openssl rand -hex 32 >secrets/better_auth_secret
: >secrets/pocket_id_client_id
: >secrets/pocket_id_client_secret

echo "Wrote secrets/. Fill pocket_id_client_id and pocket_id_client_secret."
