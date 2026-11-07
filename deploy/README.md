# Deployment

This folder holds the Docker Compose stack of ledger for the homelab host. The stack follows
the conventions of the homelab repository (`~/sites/homelab/AGENTS.md`). On the host, this
folder becomes the service folder `ledger/` of the homelab repository.

## Services

| Service      | Image                 | Task                                     |
| ------------ | --------------------- | ---------------------------------------- |
| `db`         | `postgres` (alpine)   | Postgres                                 |
| `rest`       | `postgrest/postgrest` | PostgREST, the data API of the web app   |
| `ledger-web` | `ledger-web`          | The web app and the sign-in              |
| `db-dump`    | `postgres` (alpine)   | The nightly database dump (PLAN.md, D13) |

The web app applies the missing migrations before its server starts. A failed migration
stops the start. Then the web app gives the PostgREST role `authenticator` the password
of `postgres`. `rest` and `db-dump` wait until the web app is healthy. The start order is
`db`, `ledger-web`, `rest` (PLAN.md, D12).

No part of Supabase runs. better-auth in the web app does the sign-in with Pocket ID
(PLAN.md, D3).

## Files

- `compose.yaml`: the stack.
- `compose.local.yaml`: an override to test the stack with a local image. Do not use it on
  the host.
- `Makefile`: the standard targets `up`, `down`, `update`, and `upgrade`, and the target
  `dump`.
- `generate-secrets.sh`: writes the Docker secrets to `secrets/`. See [Secrets](#secrets).
- `dump-database.sh`: writes one database dump. The service `db-dump` runs it.
- `web.Dockerfile`: the image of the web app. GitHub Actions builds it on each release
  (see `.github/workflows/docker-publish.yaml`).

Git ignores `data/` and `secrets/`.

## First setup

1. Copy this folder to `ledger/` in the homelab repository on the host.
2. Make the backup folder. The service `db-dump` runs as UID 1000:
   `mkdir -p data/backups && sudo chown 1000:1000 data/backups`.
3. Run `./generate-secrets.sh`. It writes the files in `secrets/`.
4. Make the OIDC client in Pocket ID. See [Pocket ID](#pocket-id).
5. Write the values of `secrets/pocket_id_client_id` and `secrets/pocket_id_client_secret`.
   Put one value in each file.
6. Set the tag and the digest of `ledger-web` in `compose.yaml`. See
   [Images and releases](#images-and-releases).
7. Add the ingress rule to `cloudflared/config.yml`. See [Cloudflared](#cloudflared).
8. Restart cloudflared: `cd ../cloudflared && make upgrade`.
9. Run `make up`.
10. Open `https://ledger.mitchryan.org` and sign in.
11. Add the Zerobyte mount and the Zerobyte job. See [Backups](#backups).

## Secrets

The stack uses Docker secrets. Each secret is one file in `secrets/`. Compose mounts each
file at `/run/secrets/<name>` in the services that need it. No secret is in an env variable
of `compose.yaml`.

| File                      | Services                      | Read as                                                 |
| ------------------------- | ----------------------------- | ------------------------------------------------------- |
| `postgres_password`       | `db`, `ledger-web`, `db-dump` | `POSTGRES_PASSWORD_FILE`, `PGPASSWORD_FILE`             |
| `postgrest_db_uri`        | `rest`                        | `PGRST_DB_URI=@<path>`                                  |
| `postgrest_jwt_secret`    | `rest`, `ledger-web`          | `PGRST_JWT_SECRET=@<path>`, `POSTGREST_JWT_SECRET_FILE` |
| `better_auth_secret`      | `ledger-web`                  | `BETTER_AUTH_SECRET_FILE`                               |
| `pocket_id_client_id`     | `ledger-web`                  | `POCKET_ID_CLIENT_ID_FILE`                              |
| `pocket_id_client_secret` | `ledger-web`                  | `POCKET_ID_CLIENT_SECRET_FILE`                          |

The web app reads each `<NAME>_FILE` variable in `src/env.ts`, before the validation
(`src/core/env/readSecretFiles.ts`). It removes the line break at the end of the file. Do
not set `<NAME>` and `<NAME>_FILE` together.

`postgrest_db_uri` holds the Postgres password a second time. If you change the password,
change it in `postgres_password`, in `postgrest_db_uri`, and in the database
(`alter role postgres password …`). Then restart the stack. The web app gives the new
password to `authenticator`.

The folder `secrets/` has the mode 700. The files have the mode 644, because the
containers read them as other users.

## Pocket ID

Make an OIDC client in the Pocket ID admin UI (`https://auth.mitchryan.org`):

- **Name:** `ledger`.
- **Callback URL:** `https://ledger.mitchryan.org/api/auth/callback/pocket-id`.
- **PKCE:** on.
- **Allowed user groups:** only the group of the ledger users. Pocket ID decides who has an
  account. better-auth adds a user on the first sign-in.

Register the callback URL by hand. No script does this step.

## Cloudflared

Add this rule to `cloudflared/config.yml`, before the catch-all entry:

```yaml
- hostname: ledger.mitchryan.org
  service: http://ledger-web:3000
```

Only `ledger-web` joins `cloudflared-net`. Other stacks cannot reach PostgREST or Postgres.

## Claude (MCP server)

`ledger` has an MCP server at `https://ledger.mitchryan.org/mcp` (PLAN.md, D15). The Claude
apps call it from Anthropic's addresses (`160.79.104.0/21`). Thus these paths must be
public, with no Cloudflare Access rule and no WAF challenge:

- `/mcp`
- `/.well-known/*`
- `/api/auth/oauth2/*` and `/api/auth/jwks`

To connect claude.ai, Claude Desktop, and Claude mobile:

1. In claude.ai, open **Settings**, then **Connectors**, then **Add custom connector**.
2. Enter the name `ledger` and the URL `https://ledger.mitchryan.org/mcp`. Leave the OAuth
   fields empty.
3. Sign in with Pocket ID, then select **Allow** on the consent page of `ledger`.

The connector is then in each Claude app of the account.

To connect Claude Code, run this command, then run `/mcp` in Claude Code to sign in:

```sh
claude mcp add --transport http ledger https://ledger.mitchryan.org/mcp
```

No new secret is necessary. better-auth makes the signing key of the access tokens on the
first request, and keeps it in `better_auth.jwks`, encrypted with `BETTER_AUTH_SECRET`.

## Images and releases

`ledger-web` uses the image `ghcr.io/ryami333/ledger-web`. `yarn release` in the repository
pushes a version tag, and the tag publishes the image. The image has no `latest` tag.

After each release, do these steps:

1. Get the digest of the image:
   `docker buildx imagetools inspect ghcr.io/ryami333/ledger-web:<version>`.
2. Set the tag and the digest of the pin in `compose.yaml`, for example
   `ghcr.io/ryami333/ledger-web:0.1.0@sha256:<digest>`.
3. Run `make dump`.
4. Run `make upgrade`.
5. Read the logs of `ledger-web`. They show each applied migration.

## Migrations

The web image runs `src/scripts/migrateDatabase.ts` (`yarn db:migrate` in the repository)
before the server. It applies the missing files of `db/migrations`, and records each file
in `migrations.schema_migrations`. Each file runs in one database transaction. A second run
changes nothing. Then it sets the password of `authenticator` and tells PostgREST to reload
its schema cache.

## Backups

The service `db-dump` writes `data/backups/ledger.dump` each night at 02:30 UTC
(`pg_dump -Fc`). It keeps one dump. Zerobyte supplies the history. The dump holds the
schemas `public`, `better_auth`, and `migrations`. The roles are not in the dump, because
the first migration makes them.

Zerobyte does not copy `data/postgres/`. You cannot restore a file-level copy of a data
folder that is in use. Zerobyte does not copy `secrets/`. Keep a copy of `secrets/`
somewhere else.

Add this mount to `zerobyte/compose.yaml`:

```yaml
- ../ledger/data/backups:/backup/ledger/backups:ro
```

Then add a Zerobyte volume and a job for `/backup/ledger`. Set the schedule to a time after
the dump, for example 03:30 UTC.

Run `make dump` before a migration or other risky database work. A recent Zerobyte run is
not a substitute for a dump.

### Restore

Restore the dump into a new, empty database. Do not use `pg_restore --clean`: it drops
the schema `public` and makes it again with no `USAGE` grant to PostgREST. PostgREST then
refuses each request.

To restore the dump into a running stack, do these steps:

1. Stop the services that use the database: `docker compose stop rest db-dump ledger-web`.
2. Copy the dump into the database container:
   `docker compose cp data/backups/ledger.dump db:/tmp/ledger.dump`.
3. Delete the database and make it again. The roles stay, because they are not part of a
   database:
   `docker compose exec db psql -U postgres -d template1 -c 'drop database postgres with (force)' -c 'create database postgres'`.
4. Restore the dump. The new database already has the schema `public`, thus the list
   skips that entry:
   `docker compose exec db sh -c "pg_restore --list /tmp/ledger.dump | grep -v ' SCHEMA - public ' >/tmp/ledger.list && pg_restore -U postgres --dbname=postgres --exit-on-error --use-list=/tmp/ledger.list /tmp/ledger.dump"`.
5. Start the stack: `make up`. The web app applies the migrations that are not in the
   dump, and it sets the password of `authenticator`.

To restore on a new host, first restore `secrets/`. Run `make up`, so that the first
migration makes the roles. Then do the steps above.

## Test the stack locally

`compose.local.yaml` uses the local image `ledger-web:local` and publishes the web app on
`http://localhost:3082`. The usage is in the comment at the start of the file. Copy this
folder to a temporary folder first, because the stack writes `data/` and `secrets/`.
