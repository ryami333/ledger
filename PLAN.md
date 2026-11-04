# Plan

This file holds the architecture, the data model, the decisions, and the phases of `ledger`.
Phase 0 adds [`AGENTS.md`](AGENTS.md) with the conventions and the glossary.

`ledger` is a self-hosted expense tracker for small groups, like Splitwise or Splid. The first
version has a small feature set.

## Goal

A signed-in user makes a space, adds the members of the space, and records who paid for whom.
The space shows the balance of each member in plain English, for example "Barack is owed
€12.50". The service runs on one homelab host.

## Reference projects

- **`~/sites/stripclub`** is the pattern reference. Copy its stack, its repository shape, its
  scripts, its database workflow, its sign-in, and its release pipeline. Remove the worker,
  the media files, and the private feed.
- **`~/sites/clarity`** gives the style rules in `AGENTS.md`: the writing style, the database
  rules, the TypeScript rules, the CSS rules, the React rules, and the modal rules. Phase 0
  copies these rules into the `AGENTS.md` of `ledger`. See "Conventions from Clarity" below.

## Glossary

Phase 0 copies this glossary into `AGENTS.md`.

- **User:** One row of `better_auth.users`. A person who can sign in with Pocket ID. A user
  is not a member. Each user can read and change all spaces.
- **Space:** One row of `spaces`. A group of members with a shared ledger, for example one
  trip or one household.
- **Member:** One row of `members`. A name in one space, for example "Barack". A member has
  no account and no link to a user.
- **Alias:** One row of `aliases`. A name for a set of members of one space, for example
  "Obamas' Shared Account" for Barack and Michelle.
- **Transaction:** One row of `transactions`. One payment: a date, an amount in one currency,
  the payers, and the payees. Write "database transaction" for the SQL meaning.
- **Party:** One row of `transaction_parties`. One member or one alias on one side of a
  transaction.
- **Side:** `paid_by` (the payers) or `paid_to` (the payees, who got the value).
- **Space currency:** One row of `space_currencies`. A currency that the transactions of one
  space can use, with its rate.
- **Default currency:** The one space currency with `is_default`. The transaction form
  selects it first. The balances use it.
- **Rate:** The value of one unit of a space currency in the default currency. Example: with
  the default currency EUR, the rate of USD is `0.92` (1 USD = 0.92 EUR). The rate of the
  default currency is always `1`.
- **Converted amount:** The amount of a transaction in the default currency, from the rate
  of the transaction currency.
- **Share:** The part of the converted amount that one member paid or got, in minor units.
- **Balance:** The sum of the paid shares of one member, minus the sum of the received
  shares, over all transactions of a space. A positive balance means "is owed".
- **Minor unit:** The smallest unit of a currency, for example one cent. All amounts are
  integers in minor units.

## Architecture

```
                 ┌──────────────┐  OIDC   ┌─────────────────────┐
  browser ──────▶│    ledger    │────────▶│ Pocket ID (homelab) │
                 │ TanStack     │         └─────────────────────┘
                 │ Start        │
                 └──┬────────┬──┘
     PostgREST      │        │  pg (better-auth,
     (user JWT)     ▼        ▼  migrations)
                 ┌──────────────────────────────────────┐
                 │ Postgres                             │
                 │   public.*       (app data, RLS)     │
                 │   better_auth.*  (users, sessions)   │
                 │   migrations.*   (applied versions)  │
                 └──────────────────────────────────────┘
```

- **The app** (`src/`) shows the UI and runs the server functions. It is the only process
  of `ledger`. There is no worker and no job queue.
- **Postgres and PostgREST** hold the data, as in stripclub (stripclub D11). The server
  functions call PostgREST with a short HS256 JWT: `role: authenticated`, `sub: <user ID>`.
- **better-auth** does the OIDC sign-in with Pocket ID, as in stripclub (stripclub D6). It
  uses a direct `pg` connection to the schema `better_auth`.
- **`src/core`** holds the money logic with no I/O: the parse and the format of amounts,
  the currency conversion, the split into shares, and the balances.

## Decisions

### D1: Stack

Use the stack of stripclub with no change, unless this file tells otherwise:

- Node 24, Yarn 4 (one package, no workspaces), TypeScript 6 strict.
- TanStack Start (TanStack Router, Vite, Nitro), React 19 with the React Compiler.
- Mantine 9 (`@mantine/core`, `@mantine/hooks`, `@mantine/dates`), CSS Modules with
  `classnames/bind`, React Hook Form with Zod.
- Postgres 17 and PostgREST, `@supabase/postgrest-js`, types from `supabase/postgres-meta`.
- pg-delta for migrations, pgTAP for database tests, Vitest for TypeScript.
- release-it and a GitHub workflow that builds the Docker image.

Remove these parts of stripclub: the workspaces, `apps/worker`, `packages/net`, pg-boss,
ffmpeg, OpenRouter, the media volume, and the private feed routes.

Reason: the same stack in two projects lets us copy files with small changes. Each fix in one
project is easy to move to the other.

### D2: Repository shape

```
src/                 TanStack Start app (UI, server functions, auth routes)
src/core/            Money logic and shared types, with no I/O
src/db/              PostgREST client and generated database types
db/schemas/          Declarative schema: the current shape of the database
db/migrations/       Generated migrations: the history of the changes
db/tests/            pgTAP tests
db/seeds/            Development data
deploy/              Docker Compose file, Dockerfile, Makefile, README for the homelab
scripts/             diff-database.sh, test-database.sh
```

`ledger` is one package with one `package.json` at the root, with no Yarn workspaces. It has
only one app and no worker, thus workspaces give no advantage. The folders `src/core` and
`src/db` keep the boundaries of the stripclub packages `packages/core` and `packages/db`:
`src/core` imports nothing from the rest of `src/`, and `src/db` imports only from
`src/core`.

### D3: Users and access

- Users sign in with Pocket ID through better-auth (generic OIDC plugin, provider ID
  `pocket-id`, PKCE). The callback URL is `<APP_URL>/api/auth/callback/pocket-id`. Copy
  `apps/web/src/server/auth.ts` of stripclub to `src/server/auth.ts`.
- The OIDC client of `ledger` in Pocket ID allows only one Pocket ID user group. Thus Pocket
  ID decides who has access. There is no email or password sign-in, and no invitation.
- A user is not a member. No column links `better_auth.users` to `members`.
- Each user can read and change all spaces. The RLS policies allow each operation to the role
  `authenticated`, with no row condition. The role `anon` has no grant.
- RLS stays on for each table. Reasons: the role `anon` gets nothing, the pgTAP tests check
  each table, and a later rule ("a user sees only some spaces") needs only new policies.
- `created_by` and `updated_by` hold the ID of the user that wrote the row. A trigger sets
  them from the claim `sub` of the JWT (see "Conventions from Clarity").
- PostgREST cannot read the schema `better_auth`. The view `public.app_users` (`id`, `name`,
  `image`) shows the names of the users. The view runs as its owner, thus it reads
  `better_auth.users` with no grant on that schema.

### D4: Amounts

- Each transaction has an amount and a currency: `transactions.amount_minor` and
  `transactions.currency`.
- Store each amount as `bigint` in minor units. Do not use `float`, and do not use
  `parseFloat`.
- The amount is positive. A refund is a transaction with the sides swapped.
- `src/core` converts the text of the amount input to minor units with string
  arithmetic. It reads the number of decimals of a currency from
  `Intl.NumberFormat(...).resolvedOptions().maximumFractionDigits`.
- The server formats amounts with `Intl.NumberFormat`, with the locale `APP_LOCALE` (for
  example `en-IE`) and the currency of the amount. One fixed locale on the server and in the
  browser prevents a hydration mismatch.

### D5: Space currencies

Each space has a list of space currencies (`space_currencies`). The user sets the list in the
settings of the space:

- Each space currency has an ISO 4217 code and a rate (see the glossary). The user types
  the rate. The app does not fetch rates.
- Exactly one space currency is the default currency. Its rate is `1`.
- The "New space" modal asks for the default currency. The user adds more currencies later.
- A transaction can use only a currency of its space. A space currency with transactions
  cannot be removed. The UI disables the remove button and tells why.
- The user can select a different default currency. The form then shows each rate again,
  relative to the new default currency (`rebaseRates` in `src/core`). The user can
  correct the rates before the save.
- A change of a rate changes the balances of all old transactions in that currency. This
  agrees with D7: the current configuration of the space applies to all its transactions.
  The currency form tells the user this before the save.
- `save_space_currencies(space_id, currencies)` replaces the list in one database
  transaction. It refuses a list with no default currency, or with more than one.

Rates and conversion:

- Store a rate as `numeric(18, 8)`, greater than 0. PostgREST gives a `numeric` as a JSON
  number, thus a client can lose digits. Select the rate as text: `rate::text`.
- `convertAmount` in `src/core` converts the amount with `bigint` arithmetic:
  `amount_minor × rate × 10^(default decimals − currency decimals)`. It rounds half away from
  zero to a whole minor unit of the default currency.
- The balance calculation converts each transaction first, then splits the converted amount
  (D6). Thus each side still sums to the converted amount, and the balances sum to zero.

### D6: Split rules

Each side splits the converted amount in equal parts, one part for each party. An alias is
one party, not its members:

1. Split the converted amount into one part for each party of the side.
2. A member party keeps its part. An alias party splits its part into one share for each
   member of the alias.
3. A member on the same side two times, directly and through an alias, gets both shares.
4. Each split gives `floor(amount / count)` to each recipient. The first `amount % count`
   recipients get one more minor unit. Sort the recipients by `id`, so the result does not
   change between two calculations.

Thus each side sums to the converted amount exactly, and the balances of a space sum to zero.

Example: `paid_by: [Obamas' Shared Account, Donald]`, `paid_to: everyone`, €100.00. The alias
paid €50.00: Barack €25.00 and Michelle €25.00. Donald paid €50.00. Each of the four members
got €25.00. Barack and Michelle have €0.00, Donald has +€25.00, and Melania has −€25.00.

Example of rule 3: `paid_by: [Obamas' Shared Account, Barack]`, €100.00. Barack paid €75.00
(€25.00 through the alias, €50.00 directly). Michelle paid €25.00. The form allows this
input.

A member can be on both sides. This is normal: Barack pays dinner for all four.

The "Everyone" button of Paid to adds each member that is not archived, as member parties.

Custom shares (weights, percentages, exact amounts) go to the roadmap.

### D7: Aliases

- A party is a member or an alias. `transaction_parties` stores the alias, not its members.
  Thus the transaction list shows "Obamas' Shared Account paid €40.00".
- The balance calculation expands the alias each time (D6). Thus a change of the members of
  an alias changes the balances of all its old transactions. This is the intended behavior.
  The alias form tells the user this before the save.
- An alias has one or more members. All members of an alias are in the space of the alias.
- An alias with transactions cannot be deleted. The UI disables the delete button and tells
  why.

### D8: Members

- A member has a name, unique in the space (case-insensitive).
- A member with transactions or aliases cannot be deleted. The user can archive the member
  (`archived_at`). An archived member does not show in the party picker of a new
  transaction. An archived member still shows in the balances if the balance is not zero.
- A member with no transactions and no aliases can be deleted.

### D9: Writes in more than one table

PostgREST runs one database transaction for each request. Thus each write that changes more
than one table is one RPC call to a `SECURITY INVOKER` function. RLS and the triggers then
apply as for a direct write.

- `create_space(title, description, default_currency, member_names)` inserts the space, its
  default currency, and its first members. A space always has a default currency.
- `save_space_currencies(space_id, currencies)` replaces the space currencies (D5).
- `save_alias(alias_id, space_id, name, member_ids)` inserts or updates the alias, and
  replaces its members.
- `save_transaction(transaction_id, space_id, title, description, amount_minor, currency,
transaction_date, paid_by, paid_to)` inserts or updates the transaction, and replaces its
  parties. `paid_by` and `paid_to` are `jsonb` arrays of `{ "member_id": ... }` or
  `{ "alias_id": ... }`. It refuses an empty side, a party of a different space, a currency
  that is not a space currency, and an archived member in a new transaction.

Each function returns the ID of the main row.

Two users who edit the same transaction at the same time: the last save wins. An optimistic
lock goes to the roadmap.

A delete of a transaction is a hard delete, after a confirmation. The parties go with it
(`on delete cascade`). An undo and a change history go to the roadmap.

### D10: Balances

- `src/core/balances/calculateBalances.ts` calculates the balance of each member in
  the default currency. Its input is the members, the alias members, the space currencies,
  the transactions, and the parties. It is a pure function with unit tests.
- The server function `getSpaceServerFn` loads all rows of one space and returns the
  balances with them. A space with some thousand transactions is still small. A SQL view goes
  to the roadmap, if a space gets too large.
- `describeBalance` writes the sentence, in the default currency:
  - positive: "Barack is owed €25.00."
  - negative: "Donald owes €25.00."
  - zero: "Michelle is settled up."
- The space page sorts the balances: the members who are owed first, then the members who
  owe, then the settled members.
- To settle up, a user records a normal transaction: `paid_by: Donald`, `paid_to: Barack`.
  The first version has no special payment type and no optimal settle-up path.

### D11: Dates

- A transaction has a date with no time and no time zone: `transaction_date date`. The
  feature list named this column `transaction_at`. In this project, the suffix `_at` marks a
  `timestamptz`, thus the name is `transaction_date`.
- In TypeScript, the date is a `Temporal.PlainDate`. PostgREST gives it as `YYYY-MM-DD`.
- The form sets it with the `DateInput` of `@mantine/dates`. The default is today in the time
  zone `APP_TIME_ZONE` (for example `Europe/Berlin`). One fixed zone gives the same default
  on the server and in the browser.
- `created_at` and `updated_at` stay `timestamptz`. The UI formats them in `APP_TIME_ZONE`.
- The transaction list sorts by `transaction_date`, newest first, then by `created_at`,
  newest first.

### D12: Releases and deployment

The product name is `ledger`, all lowercase, as stripclub. The host is
`ledger.mitchryan.org`.

As in stripclub (stripclub D10 and Phase 10), with one image:

- `yarn release` runs lint, the tests, the pgTAP tests, and the build. Then release-it bumps
  the version, makes the tag, and makes a GitHub release.
- The tag starts `.github/workflows/docker-publish.yaml`. It builds
  `ghcr.io/ryami333/ledger-web` for `linux/amd64`. There is no `latest` tag.
- `deploy/compose.yaml` has the services `db` (`postgres:17-alpine`, pinned digest), `rest`
  (PostgREST), `ledger-web`, and `db-dump` (D13). Only `ledger-web` joins `cloudflared-net`.
- The web container runs `yarn db:migrate` before its server. Then `rest` starts. The start
  order is `db`, `ledger-web`, `rest`.
- Secrets are Docker secrets, one file each in `deploy/secrets/`, which
  `deploy/generate-secrets.sh` writes. The app reads them through `<NAME>_FILE` variables.
- The homelab pins the tag and the digest of each image in `deploy/compose.yaml`.

### D13: Backups

stripclub writes its nightly dump in the worker. `ledger` has no worker. Thus the service
`db-dump` uses the same Postgres image, with a shell loop that runs `pg_dump -Fc` each night
into `./data/backups/ledger.dump` (schemas `public`, `better_auth`, `migrations`). Zerobyte
copies the folder. `make dump` writes one now. `deploy/README.md` gives the restore steps.

### D14: Local ports

stripclub uses `54321`, `54322`, and `3000` on the host. `ledger` uses other ports, so both
stacks can run at the same time:

- Postgres: `127.0.0.1:54332`
- PostgREST: `127.0.0.1:54331`
- Web app: `http://127.0.0.1:3001`

## Data model

All tables are in `public`. Each table has `created_at` and `updated_at`, which triggers set.
Each table with a single primary key has `id uuid` (default `gen_random_uuid()`).

- **`spaces`**: `title` (not empty), `description` (nullable), `created_by`, `updated_by`.
- **`space_currencies`**: `space_id`, `currency` (ISO 4217: 3 capital letters), `rate`
  (`numeric(18, 8)`, greater than 0), `is_default`. Primary key `(space_id, currency)`. A
  partial unique index on `space_id` where `is_default` allows one default currency for each
  space. A check requires `rate = 1` for the default currency.
- **`members`**: `space_id`, `name` (not empty), `archived_at`. Unique `(space_id,
lower(name))`. Unique `(space_id, id)`, for the composite foreign keys below.
- **`aliases`**: `space_id`, `name` (not empty). Unique `(space_id, lower(name))`. Unique
  `(space_id, id)`.
- **`alias_members`**: `alias_id`, `member_id`, `space_id`. Primary key `(alias_id,
member_id)`. Foreign keys `(space_id, alias_id)` to `aliases` and `(space_id, member_id)`
  to `members` keep all three in one space.
- **`transactions`**: `space_id`, `title` (not empty), `description` (nullable),
  `amount_minor` (`bigint`, greater than 0), `currency`, `transaction_date` (`date`),
  `created_by`, `updated_by`. Unique `(space_id, id)`. Foreign key `(space_id, currency)` to
  `space_currencies`. Index `(space_id, transaction_date desc, created_at desc)`.
- **`transaction_parties`**: `transaction_id`, `space_id`, `side` (enum `transaction_side`:
  `paid_by`, `paid_to`), `member_id` (nullable), `alias_id` (nullable). A check allows
  exactly one of `member_id` and `alias_id`. Unique `(transaction_id, side, member_id)` and
  `(transaction_id, side, alias_id)`. Composite foreign keys to `transactions`, `members`, and
  `aliases` keep the party in the space of its transaction.
- **`app_users`** (view): `id`, `name`, `image` of `better_auth.users`.

Foreign keys:

- `space_id` of each child table: `on delete cascade`. A delete of a space deletes all its
  rows.
- `member_id` and `alias_id` in `transaction_parties`, and `member_id` in `alias_members`:
  no `on delete` action. Thus a member or an alias in use cannot be deleted (D7, D8).
  Postgres checks a key with no action at the end of the statement, not at once as with
  `restrict`. Thus a delete of a space can remove all its rows with no error.
- `alias_id` in `alias_members`: `on delete cascade`. A delete of an alias deletes its
  members.
- `(space_id, currency)` in `transactions`: no `on delete` action. Thus a space currency in
  use cannot be removed (D5).
- `transaction_id` in `transaction_parties`: `on delete cascade`.
- `created_by` and `updated_by`: to `better_auth.users(id)`, `on delete set null`.

Grants for the role `authenticated`: select and delete on each table, and insert and
update on the columns that a user or a function of D9 writes. The functions of D9 run as the
caller (`SECURITY INVOKER`), thus the caller needs these grants. No grant gives `id`,
`space_id` (on update), the timestamps, or the actor columns. See `db/schemas/800_grants.sql`.

Deferred constraint triggers check the rules of the lists at the end of the database
transaction, also for a direct write through PostgREST:

- Each space has exactly one default currency (D5).
- Each alias has one or more members (D7).
- Each side of a transaction has one or more parties.

## UI

All pages use Mantine, inside one `AppShell` with the product name and a sign-out menu.

- **`/login`**: one button, "Sign in with Pocket ID".
- **`/`** (`SpacesView`): the spaces as cards (title, description, member count, date of the
  last transaction). A "New space" button opens a modal: title, description, default
  currency, and the first member names.
- **`/spaces/$spaceId`** (`SpaceView`):
  - Header: title, description, an "Edit space" menu, and the "Add transaction" button.
  - Balances panel: one line for each member, in the default currency (D10).
  - Transaction list: date, title, amount, and a short line, for example "Obamas' Shared
    Account paid for everyone". An amount in a different currency also shows the converted
    amount, for example "$40.00 (€36.80)". One click on a row opens the transaction drawer.
  - The search param `transaction` holds the ID of the open transaction, or `new`. Thus a
    reload or a link opens the same drawer.
- **Transaction drawer**: one form for a new and an existing transaction:
  - Title, Description, Amount (`NumberInput`, with the decimals of the currency), Currency
    (`Select` of the space currencies, the default currency first), Date (`DateInput`).
  - Paid by, Paid to: one `MultiSelect` each, with the groups "Members" and "Aliases". Paid
    to has an "Everyone" button (D6).
  - A preview line under the form, from `src/core`: "Obamas' Shared Account and Donald
    each paid €50.00. Each of 4 members got €25.00."
  - "Save", and on an existing transaction "Delete". Delete opens a `ConfirmModal` on top of
    the drawer (`Modal.Stack`).
- **`/spaces/$spaceId/settings`** (`SpaceSettingsView`):
  - Members: add, rename, archive, delete (D8).
  - Aliases: add, rename, change members, delete (D7).
  - Currencies: add, remove, set the rate ("1 USD = 0.92 EUR"), select the default currency
    (D5).
  - Danger zone: delete the space. The confirmation asks for the title of the space.

## Conventions from Clarity

Phase 0 writes these rules into `AGENTS.md`, from the `AGENTS.md` of Clarity, with the paths
of `ledger`. Where Clarity and stripclub give different rules, Clarity wins, except for the
stack (D1).

- **Writing style:** Write all comments, docs, commit messages, and pull-request descriptions
  in Simple Technical English (ASD-STE100).
- **Schema files:** `db/schemas/` with the file order of Clarity: `000_roles.sql`,
  `050_types.sql`, `1NN_<table>.sql` (with the foreign keys of the table),
  `400_foreign_keys.sql`, `500_functions.sql`, `600_triggers.sql`, `700_policies.sql`,
  `800_grants.sql`.
- **Actor columns:** Set `created_by` with `set_actor_on_insert('created_by')` and
  `updated_by` with `set_actor_on_write('updated_by')`. Add a check to
  `db/tests/database/actor_columns.test.sql`.
- **Timestamp columns:** Set them with `set_created_at` and `set_updated_at`, as
  `BEFORE INSERT OR UPDATE` triggers. `timestamp_columns.test.sql` finds a table with no
  trigger.
- **RLS:** Read and write user data with the user client. Name a policy
  `<table>_<action>_<role>`, for example `transactions_select_authenticated`. Add
  `.select("id")` to a write, and treat an empty result as an error.
- **Migrations:** Add a header comment with a `Rollback:` note. Make a migration safe to run
  two times where possible.
- **Names:** Use full words for variables, parameters, properties, and callback parameters.
  `id`, `url`, `json`, `iso`, `err` (in a `catch`), and `prev` (previous state) are accepted.
  Name the `.reduce` accumulator `accumulator`.
- **Functions:** Give a function one object parameter, and destructure it in the signature,
  with the exceptions of Clarity.
- **IIFE:** Do not reassign a `let` in an `if` block, and do not nest ternaries. Use an IIFE.
- **Temporal:** Import `Temporal` from `temporal-polyfill`. Use `Temporal.PlainDate` for
  `transaction_date`, `Temporal.Instant` for `created_at` and `updated_at`, and
  `Temporal.Duration` for durations.
- **Modules:** Name a module after its main export. No barrel files. Give each export a name
  that is clear at the call site, for example `createUserPostgrestClient`.
- **Server functions:** Put each TanStack server function in
  `src/serverFunctions/`, one for each file. Give its export the suffix `ServerFn`,
  and give the file the same name. Example: `serverFunctions/saveTransactionServerFn.ts`
  exports `saveTransactionServerFn`. This is the TanStack form of the `Action` suffix of
  Clarity.
- **Views:** A route file holds only the routing and the loader. It returns one view
  component, `components/views/<Name>View/<Name>View.tsx`, with its stylesheet, its types
  file, and its sub-components in the same folder.
- **Components:** Define the prop types inside the component signature. Do not add a public
  `className` prop to a structural component. Name callback props with `on`.
- **Modals:** Use thin `Modal`, `Drawer`, and `ConfirmModal` wrappers around Mantine. Close a
  modal only after the action is successful, and keep the input on an error. A delete
  confirmation has the role `alertdialog`, and the focus starts on the least destructive
  button. Do not use `window.confirm()`.
- **CSS:** One CSS module for one component, imported last. Use `data-*` attributes for
  modifiers, logical properties, one value for each shorthand, native nesting, and the
  `@media` rule inside its selector. Put each global z-index in a token.
- **Env:** Read env variables only in `src/env.ts` (`@t3-oss/env-core` and Zod).
- **Tests:** Test pure functions with no mocks. Do not unit test I/O.
- **Scripts:** Top-level await, `parseArgs` with named flags, and no top-level catch.

## Phases

### Phase 0: Repository scaffold

- [x] Copy from stripclub: `package.json` (without the worker scripts), `.node-version`,
      `.yarnrc.yml`, `tsconfig.json`, ESLint, Prettier, Stylelint, Vitest, `.gitignore`,
      `.dockerignore`, `.release-it.mjs`.
- [x] One package with the folders `src/core` and `src/db` (D2). The first version had the
      workspaces `apps/web`, `packages/core`, and `packages/db`. They are removed.
- [x] `AGENTS.md` with the glossary, the stack, the commands, and the conventions above.
      `CLAUDE.md` with `@AGENTS.md`.
- [x] `.claude/launch.json` for `yarn dev` on port 3001, with `fnm exec`.
- [x] GitHub Actions `pr-check.yaml`: lint, test, build, pgTAP, schema drift, and type drift.

Notes:

- Stylelint has the rules of Clarity for logical properties and shorthands
  (`stylelint-use-logical`), because Clarity wins for the conventions. `lint:stylelint` has
  `--allow-empty-input`, because the repository has no CSS file yet.
- `tsconfig.json` has the Node settings of the stripclub root (`nodenext`, no DOM). Phase 2
  changes it to the settings of `apps/web/tsconfig.json` of stripclub (`bundler`, DOM, JSX,
  the TanStack Router plugin).
- `package.json` has the scripts `dev`, `build`, and `start` of `apps/web` of stripclub.
  Phase 2 adds `vite.config.ts` and the dependencies of the app.
- `src/core` has `isCurrencyCode` and its test, so that `yarn test` has a test to run.
- In `pr-check.yaml`, the jobs Build, Database Types Drift, Schema Drift, and pgTAP first
  check that their files exist (`vite.config.ts` for Phase 2, `compose.yaml` for
  Phase 1). If the files do not exist, the job skips its checks and passes.
- The env block of `pr-check.yaml` uses the ports of D14 and has no `MEDIA_DIR`. Phase 2
  adds the env variables of `env.ts` that the migration script needs.
- `.gitignore` ignores `.claude/*` except `.claude/launch.json`.

### Phase 1: Database

- [x] `compose.yaml` (dev): Postgres 17 with pgTAP, PostgREST, and the `types` service, on
      the ports of D14.
- [x] `scripts/diff-database.sh`, `scripts/test-database.sh`, and
      `src/scripts/migrateDatabase.ts`, from stripclub.
- [x] Schema files: roles, `better_auth` tables, the enum `transaction_side`, the tables of
      the data model, `app_users`, the trigger functions, the functions of D9, the policies,
      and the grants.
- [x] Baseline migration `0001_baseline.sql`. `yarn db:diff` finds no change after it.
- [x] pgTAP tests:
  - RLS on for each table, `anon` gets nothing, `authenticated` can do each permitted
    operation.
  - Actor columns, timestamp columns, `SECURITY DEFINER` search paths (only `app_users` runs
    as its owner).
  - Composite foreign keys refuse a party, an alias member, or a currency of a different
    space.
  - `save_transaction` refuses an empty side. `save_space_currencies` refuses zero or two
    default currencies, and a default rate that is not `1`.
  - The delete rules of members, aliases, and space currencies.
- [x] `yarn generate` writes `src/db/database.types.ts`.
- [x] Seed: one user with the email of a Pocket ID account, the space "Washington" with
      Barack, Michelle, Donald, and Melania, the alias "Obamas' Shared Account", the
      currencies EUR (default) and USD, and some transactions in both currencies.

Notes:

- There is no role `service_role`, because `ledger` has no worker. `000_roles.sql` makes
  `anon`, `authenticated`, and `authenticator`.
- `0001_baseline.sql` is the files of `db/schemas` in their order, with a header, as in
  stripclub. `yarn db:diff` then finds no change. pg-delta prints `dangling_edge` warnings
  for the constraint triggers: it does not model them fully. Read a diff of a change to
  these triggers with care.
- The view `app_users` is in `190_app_users.sql`. No table needs `400_foreign_keys.sql`,
  thus the file does not exist.
- The parameters of the functions of D9 have the prefix `p_`, for example `p_space_id`, as
  in stripclub. PostgREST takes the parameter names as the keys of the RPC body.
- `transaction_parties` has an `id` primary key, as each table with a single primary key.
- The grants and the foreign keys differ from the first version of this plan. See "Data
  model" above.
- The pgTAP tests are in `db/tests/database/`: `rls_enabled`, `table_access`,
  `function_grants`, `security_definer_search_path`, `current_user_id`, `actor_columns`,
  `timestamp_columns`, `space_isolation`, `save_functions`, and `delete_rules`.
  `tests.run_with_deferred_checks` in `helpers.psql` runs the deferred triggers in a test.
- The local image `ledger-dev-db` has the same Dockerfile as `stripclub-dev-db`. A local
  `docker tag stripclub-dev-db ledger-dev-db` skips the slow first build.

### Phase 2: Sign-in and app shell

- [x] TanStack Start app with Mantine, CSS Modules, React Compiler, `env.ts`.
- [x] better-auth with Pocket ID, `authMiddleware`, `createUserPostgrestClient`, from
      stripclub.
- [x] Register `http://127.0.0.1:3001/api/auth/callback/pocket-id` in Pocket ID. Test one
      real sign-in.
- [x] `LoginView`, the `AppShell` layout, sign-out.
- [x] `Modal`, `Drawer`, and `ConfirmModal` wrappers (Clarity rules).

Notes:

- The local OIDC client in Pocket ID is "Ledger Local". The first real sign-in links the
  `pocket-id` account to the seed user `mitch@mitch-ryan.com`, with no second user (D3).
- `tsconfig.json` now has the settings of `apps/web/tsconfig.json` of stripclub (`bundler`,
  DOM, JSX, the TanStack Router plugin), for the whole repository. `lint:typescript` stays
  `tsc6`.
- `vite.config.ts`, `postcss.config.mjs`, and `public/` are at the repository root.
  `vite.config.ts` reads `.env` of the repository root.
- `src/db/createPostgrestClient.ts` signs only the role `authenticated`, because there is
  no service role. `src/server/createUserPostgrestClient.ts` reads the env and calls it.
- The server functions are `getCurrentUserServerFn` and `signOutServerFn`.
- `/` shows a placeholder `SpacesView`. Phase 4 adds the list.
- The modal wrappers come from Clarity, with the Mantine `CloseButton` and Mantine CSS
  variables. `src/lib/useEntityModalState.ts`, `src/lib/stringBool.ts`, and
  `src/styles/tokens/z-index.css` come from Clarity too.
- Tested by hand with dummy Pocket ID values: `/` opens `/login`. A session row of the
  seed user, with a cookie signed by the dummy secret, opens the `AppShell` with the name
  of the user, and "Sign out" deletes the session. The user client reads the seed space
  through PostgREST.

### Phase 3: Money logic

All in `src/core`, with unit tests:

- [x] `parseAmount` and `formatAmount` (D4). Test currencies with 0, 2, and 3 decimals.
- [x] `parseRate`, `convertAmount`, and `rebaseRates` (D5). Test the rounding, and a
      conversion between currencies with different decimals.
- [x] `splitSide` (D6). Test the alias as one party, a member on a side two times, that each
      side sums to the converted amount, and that the result does not change with the input
      order.
- [x] `calculateBalances` (D10). Test that the balances sum to zero, also with more than one
      currency.
- [x] `describeBalance` and `describeTransaction` (the preview and list lines).
- [x] Zod schemas for the transaction form, the alias form, the currency form, and the space
      form.

Notes:

- The folders are `src/core/money` (amounts), `src/core/currencies` (rates),
  `src/core/balances` (split and balances), `src/core/transactions` (text and party
  values), and `src/core/forms` (Zod schemas).
- The input types of `src/core` use the column names of `db/schemas`, for example
  `amount_minor`, `is_default`, and `member_id`. `src/core` does not import
  `src/db/database.types.ts`.
- `amount_minor` is a `bigint` in `src/core`. PostgREST gives a `bigint` as a JSON number.
  Thus `src/db` or the server function must convert it with `BigInt(...)`. The transaction
  form refuses an amount above `Number.MAX_SAFE_INTEGER` minor units (`MAX_AMOUNT_MINOR`),
  so that the JSON number keeps all its digits.
- A rate in `src/core` is a scaled rate: a `bigint`, the rate times 10^8, as
  `numeric(18, 8)`. `parseRate` reads the text of `rate::text`. `formatRate` writes the
  text for the rate input and for `save_space_currencies`, with no zeros at the end.
- `parseAmount` accepts a decimal point only, with no thousands separator. It refuses more
  decimals than the currency has. It does not round. `formatAmountInput` writes the text of
  an existing amount for the form.
- `formatAmount` gives a decimal text to `Intl.NumberFormat`, not a number. With `en-IE`,
  USD shows as "US$40.00", not as "$40.00" as in the UI section.
- A currency must be known to `Intl` (`isSupportedCurrency`), so that the decimals are
  correct. `Intl` gives 2 decimals for an unknown code.
- `rebaseRates` takes and gives the rows of the currency form, with each rate as text. It
  keeps a rate text that is not valid. It returns `null` when the new default currency has
  no valid rate. A very small rate can round to "0". The currency form schema then refuses
  it, and the user corrects it.
- `calculateBalances` also sorts the result (D10). In each group, the largest amount comes
  first, then the name. It omits an archived member with a balance of zero (D8). It throws
  when the rows do not agree, for example a transaction in a currency that is not a space
  currency.
- `describeTransaction` writes the list line, for example "Obamas' Shared Account paid for
  everyone". Paid to is "everyone" when its members, also through an alias, include each
  member that is not archived. The names are in alphabetical order.
- `describeTransactionPreview` writes the preview line. It splits the amount in the
  currency of the transaction, among the parties of each side, and keeps the order of the
  form. With unequal parts it writes, for example, "€33.33 or €33.34". More than 3 member
  parties give "Each of 4 members".
- The party picker uses the option values `member:<id>` and `alias:<id>`
  (`partyValueHelpers.ts`). The transaction form schema converts them to the jsonb parties
  of `save_transaction`.
- The output of each form schema has the parameters of its function in D9. The edit form
  of a space uses `spaceFormSchema.pick({ title: true, description: true })`. The space form
  allows zero member names.
- The transaction form schema checks the decimals of the amount after the other fields are
  valid, because the check needs the currency.

### Phase 4: Spaces, members, aliases, and currencies

- [x] `SpacesView`: the list and the "New space" modal.
- [x] `SpaceSettingsView`: members, aliases, currencies, the delete of the space.
- [x] Server functions with the user client. Each write returns an error on an empty result.

Notes:

- The server functions are `getSpacesServerFn`, `createSpaceServerFn`, `getSpaceServerFn`,
  `getSpaceSettingsServerFn`, `updateSpaceServerFn`, `deleteSpaceServerFn`,
  `saveMemberServerFn`, `setMemberArchivedServerFn`, `deleteMemberServerFn`,
  `saveAliasServerFn`, `deleteAliasServerFn`, and `saveSpaceCurrenciesServerFn`.
- A server function validates its input with the form schema of `src/core`. The client
  sends the output of the form, thus each schema of Phase 4 accepts its own output.
  `optionalTextSchema` accepts `null` for this reason.
- `src/server/throwDatabaseError.ts` logs only the Postgres error code. The UI shows a text
  from `chooseDatabaseErrorMessage` (`src/core/errors`), not the text of the Postgres error.
  A unique name gives "Another member of the space has this name.", and a row in use gives
  a text that tells why.
- postgres-meta types each function argument as not nullable. `src/db/LedgerDatabase.ts`
  makes `p_description`, `p_alias_id`, and `p_transaction_id` nullable. The PostgREST client
  uses `LedgerDatabase`.
- The loaders return `locale` (`APP_LOCALE`), because `env.ts` is server only.
- `/spaces/$spaceId` shows a placeholder `SpaceView` with the title and a link to the
  settings. Phase 5 adds the balances and the transactions. The "Edit space" menu of the UI
  section is the Details section of the settings page for now.
- The settings page also has a Details section for the title and the description.
- The Delete and Remove buttons of a row in use are disabled, with a tooltip that tells why.
  The default currency cannot be removed: select a different default currency first.
- `src/lib/mantineTheme.ts` gives the Mantine popovers (Select, MultiSelect, Menu, Tooltip)
  the z-index `--z-index--popover` (1700), above the modals. With the Mantine default
  (300), a Select in a modal shows its options below the modal.
- The pickers have `selectFirstOptionOnChange`, so that Enter selects the first match.
- Tested by hand in Chrome: make a space with two members, add a member, refuse a name
  that differs only in capital letters, rename, archive, add and delete an alias, add USD
  at 0.92, select USD as the default currency (EUR becomes 1.08695652), delete a member,
  change the title, and delete the space. On the seed space, the Delete and Remove buttons
  of the rows in use are disabled.

### Phase 5: Transactions and balances

- [x] `SpaceView`: header, balances panel, transaction list.
- [x] Transaction drawer: add, edit, delete, with the search param `transaction`.
- [x] The preview line under the form.
- [x] Test by hand: add, edit the date, change an alias, change a rate, change the default
      currency, delete, and check the balances after each step.

Notes:

- The new server functions are `saveTransactionServerFn` and `deleteTransactionServerFn`.
  `getSpaceServerFn` now loads all rows of the space in one PostgREST query and returns the
  balances (D10).
- `getSpaceServerFn` converts `amount_minor` with `BigInt(...)` and adds
  `converted_amount_minor` to each transaction. It sends `transaction_date` as the text
  `YYYY-MM-DD`, because a `Temporal` object cannot go from the server to the browser. A
  `bigint` can.
- The loader also returns `defaultTransactionDate` (today in `APP_TIME_ZONE`) and
  `defaultCurrency`, because `env.ts` is server only.
- `transactionFormSchema` does not accept its own output (a `bigint` and a
  `Temporal.PlainDate`). Thus the client sends the form input (`form.getValues()`) to
  `saveTransactionServerFn`, and the server parses it with the same schema. The client
  validates with the same schema before the send.
- The route has a Zod search schema: `transaction` is `new` or a UUID. A value that is not
  valid closes the drawer. An ID that is not in the space also closes the drawer.
- Each row of the transaction list is a link to `?transaction=<id>`. Thus a reload, a link,
  and the back button of the browser open and close the same drawer.
- `SpaceView` keeps the last transaction while the drawer slides out, and gives the form a
  new key on each open. The form then starts again from the values of the transaction.
- The drawer and the delete `ConfirmModal` are in one `Modal.Stack` (`transaction-drawer`,
  `transaction-delete`). Escape closes only the confirmation. A close of the drawer, for
  example with the back button, also closes the confirmation.
- The party picker has the groups "Members" and "Aliases". An archived member is an option
  only when the transaction already has the member (D8). "Everyone" replaces Paid to with
  each member that is not archived (D6).
- The preview line splits the amount in the currency of the transaction, not in the default
  currency (`describeTransactionPreview`). `toPartyRow` in `partyValueHelpers.ts` converts a
  picker value to a party row for it.
- The "Edit space" menu has one item, a link to the settings page.
- Tested by hand in Chrome on "Washington". Each step gave the expected balances, and the
  balances summed to zero: add €40.00 paid by Donald for everyone, change the date to
  1 Oct 2026 and the payer to the alias (the row moves to the end of the list), set USD to
  1.00 (the museum row shows "(€40.00)"), set USD to 0.92 and select USD as the default
  currency (the balances show in US$), and delete the transaction. At the end, EUR is the
  default currency again, and USD is 0.92, as in the seed.
- The dev server of a different session cached a failed import of `TransactionDrawer.tsx`,
  because `SpaceView.tsx` was written first. The page then rendered only in the browser. A
  `touch` of the files fixed it. Look for "Switched to client rendering" in the console.

### Phase 6: Deployment

- [ ] `deploy/web.Dockerfile` (Alpine, Node 24, `yarn workspaces focus --production`), from
      stripclub.
- [ ] `deploy/compose.yaml` with `db`, `rest`, `ledger-web`, and `db-dump` (D12, D13).
- [ ] `deploy/generate-secrets.sh`, `deploy/Makefile`, `deploy/README.md`.
- [ ] `docker-publish.yaml` and release-it. First release and digest pins.
- [ ] Pocket ID: a new OIDC client for `ledger`, limited to one user group, with the callback
      URL `https://ledger.mitchryan.org/api/auth/callback/pocket-id`. Test one real sign-in on
      the host.
- [ ] Add the Zerobyte job for `./data/backups`.

## Roadmap

- Settle up: calculate the smallest set of payments that brings each balance to zero. Add a
  "Settle up" button that fills the transaction drawer with one of these payments.
- Custom splits: weights, percentages, and exact amounts for each member or alias.
- Fetch the rates from a public source (for example the ECB), as a suggestion in the
  currency form.
- A change history of each transaction, with audit rows from database triggers, as in
  Clarity. Then an undo for a delete.
- An optimistic lock on `updated_at` for two editors at the same time.
- Categories, search, and filters (in the URL search params).
- Receipt photos.
- CSV export of a space.
- Archive a space.
- Access for some users only to some spaces (new RLS policies, D3).
- A link from a user to a member, for "you owe" texts.
- A SQL view for the balances, if a space gets too large for D10.

## Decided questions

- **Amount and currency:** Each transaction has an amount and a currency. Each space has a
  list of currencies with rates and one default currency (D4, D5).
- **Alias in a split:** An alias is one party of its side. Its part then splits among its
  members (D6).
- **Alias changes:** A change of the members of an alias changes old balances (D7).
- **Rate changes:** A change of a rate changes old balances (D5).
- **Date or time:** A date with no time and no time zone, `transaction_date` (D11).
- **Name and host:** `ledger` and `ledger.mitchryan.org` (D12).
- **Server function names:** The folder `serverFunctions/` and the suffix `ServerFn`
  ("Conventions from Clarity").
- **A member on a side two times:** Allowed. `paid_by: [Obamas' Shared Account, Barack]`
  gives Barack 75 % and Michelle 25 % (D6, rule 3).
