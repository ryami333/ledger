# ledger — Project Instructions for Agents

**Project:** A self-hosted expense tracker for small groups, like Splitwise or Splid.

A signed-in user makes a space, adds the members of the space, and records who paid for whom.
The space shows the balance of each member in plain English, for example "Barack is owed
€12.50". The service runs on one homelab host.

## Start here

Read [`PLAN.md`](PLAN.md) before you start a task. It holds the architecture, the data model,
the decisions (D1 to D14), and the phases. Update `PLAN.md` when a decision changes or a phase
is complete.

The repository is new. Some files and commands in this document do not exist yet. They show
the target state. When you add one of them, follow this document.

## Glossary

These terms have a specific meaning in this project. Use them with this meaning in code,
comments, docs, and chat.

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

## Language and writing style

Write code identifiers, comments, and docs in English.

Write the product name as `ledger`: one word, all lowercase. Keep the lowercase also at the
start of a sentence, in titles, and in the UI.

Write all comments and documentation in Simple Technical English (ASD-STE100). Use this
style also for commit messages, pull-request descriptions, and reviews. Obey these rules:

1. Write in the active voice.
2. Use the simple tenses only.
3. Write one instruction in one sentence.
4. Write instructions of 20 words or less. Write descriptions of 25 words or less.
5. Use the same word for the same thing every time. Use the terms of the glossary.

## Core principles

1. **Self-hosted.** The app, PostgREST, and Postgres run on one host with Docker Compose.
   There is no worker and no job queue.
2. **Integer money.** Store and calculate each amount as an integer in minor units (`bigint`
   in Postgres, `bigint` in TypeScript). Do not use `float`, and do not use `parseFloat`.
3. **Pure money logic.** The parse, the format, the conversion, the split, and the balances
   are pure functions in `src/core`, with unit tests.
4. **Strict RLS.** Each table in `public` has RLS on. The web app reads and writes data with
   the user client: PostgREST with a JWT of the role `authenticated`. The role `anon` gets
   nothing.
5. **Strict TypeScript.** Do not use `any`. Use `unknown` with type narrowing.
6. **No secrets and no personal data in logs.** Log IDs, durations, and status. Do not log a
   token, a secret, or the text of a transaction.

## Tech stack

- **Runtime:** Node 24, Yarn 4, TypeScript 6 strict. The repository is one package
  with no workspaces. Use `fnm` for other Node
  versions, for example `fnm exec --using=24.22.2 -- yarn lint`.
- **Web app:** TanStack Start (TanStack Router, Vite, Nitro), React 19 with the React
  Compiler, Mantine 9 (`@mantine/core`, `@mantine/hooks`, `@mantine/dates`), CSS Modules with
  `classnames/bind`, React Hook Form with Zod.
- **Database:** Postgres 17 and PostgREST, with a declarative schema. No part of Supabase
  runs. The local stack is `compose.yaml` in the repository root.
- **Data access:** `@supabase/postgrest-js`, with types from `supabase/postgres-meta`. The
  client signs a short HS256 JWT for each request: `role: authenticated`,
  `sub: <user ID>`. Do not add `@supabase/supabase-js`.
- **Sign-in:** better-auth in the web app, with the self-hosted Pocket ID as its only
  provider (generic OIDC, provider ID `pocket-id`). The tables are in the schema
  `better_auth`. There is no email or password sign-in. See `PLAN.md` (D3).
- **Migrations:** pg-delta writes them from the schema files.
- **Tests:** Vitest for TypeScript, pgTAP for the database.
- **Release:** release-it and a GitHub workflow that builds the Docker image
  `ghcr.io/ryami333/ledger-web`.

The pattern reference is `~/sites/stripclub`. It has the same stack. Copy its files with
small changes where you can.

## Repository layout

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

Put logic that has no I/O in `src/core`. Examples: the parse and the format of amounts,
the currency conversion, the split into shares, the balances, and the Zod schemas of the
forms. The rest of the app imports it from there.

Keep these boundaries:

- `src/core` imports nothing from the rest of `src/`.
- `src/db` imports only from `src/core`.

## Local ports

The local stack uses other ports than stripclub, so both stacks can run at the same time:

- Postgres: `127.0.0.1:54332`
- PostgREST: `127.0.0.1:54331`
- Web app: `http://127.0.0.1:3001`

## Commands

```bash
yarn dev              # Web app dev server on port 3001
yarn build            # Build the web app
yarn test             # Vitest
yarn lint             # Prettier, ESLint, TypeScript, Stylelint
yarn format           # Prettier, write the changes
yarn db:start         # Start the local stack (compose.yaml) and apply the migrations
yarn db:stop          # Stop the local stack
yarn db:reset         # Delete the local data, then apply the migrations and the seed
yarn db:seed          # Load db/seeds into the local database
yarn db:migrate       # Apply the missing migrations to DATABASE_URL
yarn db:diff <name>   # Write a migration from the schema files (pg-delta)
yarn db:test          # pgTAP tests in a new database, ledger_test
yarn db:psql          # psql in the local database
yarn generate         # Generate database types into src/db (postgres-meta)
yarn release          # release-it: bump, tag, GitHub release; the tag publishes the image
```

## Database conventions

### Read the current schema in `db/schemas/`

The schema is declarative. The files in `db/schemas/` hold the current shape of the
database. Read these files to find the shape of a table, a function, a policy, or a grant.
Do not read `db/migrations/` for this purpose. The migrations are only the history of the
changes.

The files are in this order:

- `000_roles.sql`: the PostgREST roles.
- `050_types.sql`: the types, for example the enum `transaction_side`.
- `1NN_<table>.sql`: one file for each table, with its columns, its constraints, its
  indexes, and its foreign keys.
- `400_foreign_keys.sql`: a foreign key that the schema adds after the two tables exist. Each
  other foreign key is in the file of its table.
- `500_functions.sql`: the functions.
- `600_triggers.sql`: the triggers.
- `700_policies.sql`: the RLS policies on the tables in `public`.
- `800_grants.sql`: the grants.

### Change the schema

1. Edit the file in `db/schemas/`.
2. Run `yarn db:diff <name>`. It writes `db/migrations/<NNNN>_<name>.sql`.
3. Read the migration. Add a header comment with a `Rollback:` note (see below).
4. Run `yarn db:migrate` and `yarn db:test`.
5. Run `yarn generate`.
6. Commit the schema file, the migration, and the generated types together.

`yarn db:diff` refuses a drop or a revoke. Read the plan, then run it again with
`--allow-drops`. pg-delta does not see data changes. Write these by hand in the migration.

`yarn db:reset` deletes the local data. Ask the user first.

### Set actor columns with a trigger

Set the actor columns `created_by` and `updated_by` with a database trigger, not in the app.
RLS does not check the value that a client sends. The trigger reads the user ID from the
claim `sub` of the JWT.

Use a trigger function from `db/schemas/500_functions.sql`, with the column name as the
argument:

- `set_actor_on_insert('created_by')`: for a "created by" column. An update keeps the old
  value.
- `set_actor_on_write('updated_by')`: for an "updated by" column.

Add a check for each new trigger to `db/tests/database/actor_columns.test.sql`.

### Set timestamp columns with a trigger

A column default applies only when the client sends no value. Thus set `created_at` and
`updated_at` with a database trigger, not with the default alone:

- `set_created_at`: for a `created_at` column. An update keeps the old value.
- `set_updated_at`: for an `updated_at` column.

Run both triggers `BEFORE INSERT OR UPDATE`. These triggers have no exception for a role. A
backfill with old dates must disable the trigger first.
`db/tests/database/timestamp_columns.test.sql` fails for a table that has one of these
columns but not its trigger.

### Name time columns by their type

- The suffix `_at` marks a `timestamptz`, for example `created_at` and `archived_at`.
- The suffix `_date` marks a `date` with no time and no time zone, for example
  `transaction_date`.

### Let RLS control each query for a user

To read or write data for a signed-in user, use the user client (`context.db` of
`authMiddleware`, or `createUserPostgrestClient`). Do not check access in the app and then
query with a client that ignores RLS.

If no policy allows the query, add a policy. Add a pgTAP test for the permitted query and for
the role `anon`.

Remember these RLS rules:

- If RLS refuses a SELECT, an UPDATE or a DELETE, Postgres gives no error. The query has zero
  rows. Thus test a permitted query too. Add `.select("id")` to a write, and return an error
  if the result is empty.
- An UPDATE also checks the new row against the SELECT policies.
- A policy controls rows, not columns. To limit the columns, grant UPDATE on some columns
  only. See `db/schemas/800_grants.sql`.

### Name a policy after its table, action, and role

Name a policy `<table>_<action>_<role>`. Example: `transactions_select_authenticated`.

### Write each change of more than one table in one function

PostgREST runs one database transaction for each request. Thus a write that changes more than
one table is one RPC call to a `SECURITY INVOKER` function. RLS and the triggers then apply as
for a direct write. See `PLAN.md` (D9).

Give each `SECURITY DEFINER` function `SET search_path = ''`, and add a pgTAP test for it.

### Migration conventions

The code review refuses a migration that fails on a second run, or that has no way back.
`yarn db:diff` gives neither of these, thus add both by hand.

#### Make each migration safe to run two times

A second run must succeed and must not change the result. Use these forms where possible:

| Statement                    | Safe form                                                                                 |
| ---------------------------- | ----------------------------------------------------------------------------------------- |
| `create table`, `add column` | `create table if not exists`, `add column if not exists`                                  |
| `create index`               | `create index if not exists`                                                              |
| `create function`            | `create or replace function`                                                              |
| `create trigger`             | `create or replace trigger`                                                               |
| `create policy`              | `drop policy if exists`, then `create policy`                                             |
| `drop ...`                   | `drop ... if exists`                                                                      |
| `create type ... as enum`    | a `do` block that ignores `duplicate_object` (Postgres has no `if not exists` for a type) |
| `insert`                     | `insert ... on conflict do nothing`, or `on conflict ... do update`                       |
| `update`, `delete`           | a `where` clause that finds no row after the first run                                    |

A `grant` and a `revoke` are safe on a second run.

To test it, run the migration two times in one database transaction, then roll back:

```
begin;
\i db/migrations/<NNNN>_<name>.sql
\i db/migrations/<NNNN>_<name>.sql
rollback;
```

#### Give a way back

Write a `Rollback:` note in the header comment of the migration. Tell in plain words how to
undo the change, in the reverse order of the migration. Name each object, and name the
migration that has its earlier definition. Example:

```
-- Rollback: drop the policy aliases_update_authenticated, then create
-- aliases_update_own again as in 0004_aliases.sql.
```

## JavaScript and TypeScript conventions

### Use the parameter object pattern

Give a function one parameter, an object, instead of several positional parameters.
Destructure the object in the function signature.

Some functions are exceptions to this rule:

- A function with one primitive parameter, where the parameter is clearly the operand.
  Example: `isCurrencyCode(input: string)`.
- A function with two parameters, where the first parameter is a single primitive value that
  is clearly the operand, and the second parameter is an options object. Example:
  `truncate(input: string, options: TruncateOptions)`.
- A function whose parameter types come from its intended use, not from this rule. Example:
  `sortDates(a: Temporal.PlainDate, b: Temporal.PlainDate)`, for use as
  `dates.sort(sortDates)`.
- A function with two parameters of the same type, where the two parameters are
  interchangeable operands of a symmetric operation. Example:
  `overlap(a: Set<string>, b: Set<string>)`.
- A function that follows an established two-positional-argument convention from a
  well-known idiom outside this project. Example: `t(template, vars)`, the
  gettext-style translation helper.

### Use unambiguous names for variables, parameters, and properties

Name each variable, function parameter, object property, and destructured binding with a full
word. Do not use a short form, like a single letter or an abbreviation such as `msg` or `idx`.
An accepted initialism is the exception: use one when it is more familiar than the words it
stands for, for example `id`, `url`, `html`, `json`, `csv`, or `iso`. The unused-parameter
name `_` is also exempt (see below). Two more short forms are exempt, each for one specific
role:

- `err` as an error binding: the binding in a `catch` clause, or the parameter of a
  promise-rejection callback. Examples: `catch (err) { ... }`,
  `promise.catch((err) => { ... })`.
- `prev` for the previous value of a state. Example: `setCount((prev) => prev + 1)`.

Do not use `err` or `prev` in a different role. Write the full word there.

This rule applies also to:

- the callback parameter of `.map`, `.filter`, `.forEach`, and other array methods
- a `for...of` loop variable
- a classic `for (let i = 0; ...)` counter

```ts
// Not this
members.map((m) => { ... });
for (const m of members) { ... }
for (let i = 0; i < members.length; i++) { ... }

// Do this
members.map((member) => { ... });
for (const member of members) { ... }
for (let memberIndex = 0; memberIndex < members.length; memberIndex++) { ... }
```

**Reason:** The build makes a minified bundle. The build shortens each long name. A long name
has no runtime cost and no bundle-size cost. A short name only costs the reader time.

Some nouns have the same form in the singular and the plural, for example "sheep". For these
nouns, add the word `Item` to the end of the singular form: `sheep.map((sheepItem) => ...)`.

Name the accumulator parameter of `.reduce` and `.reduceRight` `accumulator`. Do not name it
after the array item, and do not shorten it.

```ts
const total = shares.reduce((accumulator, share) => accumulator + share, 0n);
```

Name an unused callback parameter `_`. Use `_` when the array method needs a later parameter,
for example the index, but the callback body does not use an earlier parameter.

```ts
// The callback uses only the index, not the item.
recipients.filter((_, index) => index < remainder);
```

Carry a full-word name through to each place that reads or holds the same value. Rename each
of these too:

- an object property built from the value
- a prop that goes to a component
- a field on a returned record

Do not rename only the variable or the parameter. If a short property name like `msg`, `k`,
or `e` stays near, the reader still finds a short name one line later.

Keep one name for one concept in a function. Do not spell a value out in full at the
declaration, then read the value through a short alias a few lines later. Do not use a
generic name (`accumulator`, `index`, `item`) for a second, unrelated value in a nested
scope. Give the value in the nested scope its own specific name.

```ts
// Not this: the inner reduce's `accumulator` hides the outer `accumulator`
sides.reduce(
  (accumulator, side) =>
    accumulator +
    side.shares.reduce((accumulator, share) => accumulator + share, 0n),
  0n,
);

// Do this
sides.reduce(
  (accumulator, side) =>
    accumulator +
    side.shares.reduce((sideTotal, share) => sideTotal + share, 0n),
  0n,
);
```

A new, more explicit name can clash with a name in the same scope. When this occurs, do not
shorten the new name. Give the other value a more specific name. Keep the full word for the
new name.

```ts
// Not this: the new value gets a single letter, `m`, so the parameter can keep `member`.
function updateMember(member: Member) {
  const m = members.find((candidate) => candidate.id === member.id);
  return members.map((item) => (item === m ? member : item));
}

// Do this: the parameter gets the more specific name, the new value keeps the full word.
function updateMember(updatedMember: Member) {
  const matchedMember = members.find(
    (candidate) => candidate.id === updatedMember.id,
  );
  return members.map((member) =>
    member === matchedMember ? updatedMember : member,
  );
}
```

### Use an IIFE instead of a mutable variable or a nested ternary

Do not declare a variable with `let` and a default value, then reassign it in an `if` block.
Calculate the value with an Immediately Invoked Function Expression (IIFE), and assign the
result to one `const`. The variable is then read-only, and the calculation is in one place.

```ts
// Not this
let label = "is settled up";
if (balance > 0n) {
  label = "is owed";
}

// Do this
const label = (() => {
  if (balance > 0n) return "is owed";
  return "is settled up";
})();
```

Use the same pattern for a nested ternary that you assign to one `const`. A nested ternary is
a ternary whose consequent or alternate is also a ternary.

```ts
// Not this
const sentence =
  balance > 0n
    ? `${name} is owed ${amount}.`
    : balance < 0n
      ? `${name} owes ${amount}.`
      : `${name} is settled up.`;

// Do this
const sentence = (() => {
  if (balance > 0n) return `${name} is owed ${amount}.`;
  if (balance < 0n) return `${name} owes ${amount}.`;
  return `${name} is settled up.`;
})();
```

The value here is a text, not a CSS class name. To select a style by value, do not map the
value to a class name in an IIFE. Use a `data-*` attribute (see "Styling conventions").

A single ternary with no nesting is correct. Do not change `const x = cond ? a : b` to an
IIFE.

### Use Temporal for dates and durations

Import `Temporal` from `temporal-polyfill`: `import { Temporal } from "temporal-polyfill";`.
The ESLint rule `no-restricted-globals` refuses the global `Temporal`, because the support in
browsers and in Node is not complete. Use `Temporal` in place of the native `Date`. A `Date`
is mutable, it parses ambiguously, and it uses the local time by default.

Use these types:

- `Temporal.PlainDate` for a date with no time and no time zone, for example
  `transaction_date`. PostgREST gives it as `YYYY-MM-DD`. A `PlainDate` cannot move to the
  day before, because it holds no time zone.
- `Temporal.Instant` for one point in time, for example `created_at` and `updated_at`. Use
  `Temporal.ZonedDateTime` for a point in time in a time zone. The UI uses the time zone
  `APP_TIME_ZONE`.
- `Temporal.Duration` for a length of time.

Do not multiply numbers to make a duration. The reader must do the arithmetic to find the
value, and the unit is not written.

```ts
// Not this
const DAY_MS = 24 * 60 * 60 * 1000;

// Do this
const DAY_MS = Temporal.Duration.from({ days: 1 }).total({
  unit: "milliseconds",
});
```

Keep the native `Date` in these cases:

- A timeout or an interval that is one literal number, for example
  `const CHECK_TIMEOUT_MS = 4_000`. There is no arithmetic, and the name gives the unit.
- `Date.now()` to measure the duration of an operation, or to stamp a log line.
- A value that goes directly to an API that needs a `Date`, for example a cookie option.
  Make the value with `Temporal`, then give the `Date` to the API.

### Read env variables in one file

Read env variables only in `src/env.ts`, with `@t3-oss/env-core` and Zod. Do not
read `process.env` in other files. The ESLint rule `no-restricted-properties` enforces this.

## Module conventions

- Name a module after its main export. The main export is the main value of the module, not
  a type. Use the same letter case as the export name, for example
  `createUserPostgrestClient.ts` for the export `createUserPostgrestClient`.
- A module can have more than one export. Use this only to group simple, closely related
  helpers under one name. Example: `dateFormatHelpers.ts` can export `formatDate`,
  `parseDate`, and `compareDates`.
- Give each export a name that is clear at each call site, with no knowledge of its module
  path. A name that is clear only in its folder is not specific enough. Example:
  `createUserClient` is clear in `src/db`, but not in a view. Name it
  `createUserPostgrestClient`.
- Do not add an `index.ts` file that only exports again from other files (a "barrel file").
  Import each symbol from the file that declares it.

### Server functions

Put each TanStack Start server function in `src/serverFunctions/`, one for each
file. Give its export the suffix `ServerFn`, and give the file the same name. Example:
`serverFunctions/saveTransactionServerFn.ts` exports `saveTransactionServerFn`.

The suffix marks the export as a server function at each call site. It is the TanStack form
of the suffix `Action` of Clarity.

Read and write user data in a server function with the user client (`context.db` of
`authMiddleware`). Each write adds `.select("id")` and returns an error on an empty result.

## Web app conventions

### Routes and views

- A route file in `src/routes/` holds only the routing and the loader. It returns
  one view component. It gives the data to the view component as props.
- Give the view component the suffix `View`, for example `SpaceView`. Do not add a second
  suffix: use `SpaceView`, not `SpaceViewPage` or `SpacePageView`.
- Use the suffix `View` only for this component. A sub-component of a view has a name that
  tells what it does, for example `BalancesPanel` or `TransactionDrawer`.
- If a page can show different states, for example "not found", give the view component one
  prop that tells the state. The route file then returns the same view component for each
  state.
- Put each view component in its own folder:
  `src/components/views/<Name>View/<Name>View.tsx`. Put these files in the same
  folder:
  - the stylesheet, `<Name>View.module.css`
  - the types file, `<Name>View.types.ts`
  - each sub-component that only this view uses, with its stylesheet

  A module that a layout, a route file, or a different view also uses is not specific to the
  view. Put it in `src/lib/` or in a shared folder in `src/components/`.

- Keep the state of a page that a link must open again in the URL search params, with a Zod
  search schema. Example: the search param `transaction` holds the ID of the open
  transaction, or `new`.

### React components

- The React Compiler is on (the Babel plugin in `vite.config.ts`). In most cases, do
  not add `useMemo` or `useCallback` by hand. The compiler adds this memoization at build
  time.
- Define the prop types in the component signature. Do not make a separate
  `type Props = { … }` declaration above the component. If you must export a prop type, get
  it with `React.ComponentProps<typeof FooComponent>`.
- Do not add a public `className` prop to a structural component. The import order of CSS
  Modules is not always predictable, thus specificity problems can occur. If you cannot
  express an override as a "flag" prop, put the markup for that context in the `children`
  prop.
- Use the `classnames/bind` variant of the `classnames` package to combine CSS Module class
  names. Do not use the default `classnames` import. Bind the imported `styles` object to a
  `cx` function, and make the `className` string with `cx`.

  ```tsx
  import classNames from "classnames/bind";
  import styles from "./Example.module.css";

  const cx = classNames.bind(styles);

  function Example({ isActive }: { isActive: boolean }) {
    return <div className={cx("root", { active: isActive })} />;
  }
  ```

- Put the line `import styles from "./Example.module.css"` last in the imports of the module.
  The stylesheet order is then predictable, and specificity problems are fewer. Prettier
  sorts the imports in this order.
- Name callback props with the prefix `on`. Examples: `onClick`, `onRequestClose`.
- Name the constant that holds the return value of `useEffectEvent` after the callback prop,
  with `notify` in place of `on`. Example: `const notifyChange = useEffectEvent(onChange)`.

### Forms

Use React Hook Form with a Zod schema from `src/core`. Type `defaultValues` with
`z.input` and `onSubmit` with `z.output`. `onSubmit` returns `Promise<void>`.

### Modals

- Use the thin wrappers around Mantine in `src/components/ui/`: `Modal` for each
  modal, `Drawer` for a panel at the side of the viewport, and `ConfirmModal` for a
  confirmation. Do not use the Mantine `Modal` or `Drawer` directly in a feature.
- Close a modal only after its action is successful. If the action fails, show the error and
  keep the modal open, so the user can try again. The modal then keeps the input of the user.
  Put the `close()` call in the `try` block after the action, not after the `try`/`catch`.
- Give a modal the role `"dialog"` (the default) when it shows information or asks for input.
  Give it the role `"alertdialog"` only when it interrupts the user to confirm an urgent or
  destructive action, for example a delete. An `"alertdialog"` must point
  `aria-describedby` to its message. Its first focus must go to the least destructive
  button: set `data-autofocus` on that button.
- Keep the open state in the owner component, with `isOpen` and `onRequestClose`. For a modal
  about one entity (for example the row to delete), keep the entity after the close, so the
  modal keeps its text while it fades out.
- To open a modal on top of a modal or a drawer, put them in one `Modal.Stack`, and give each
  a fixed `stackId` with the feature as prefix, for example `"transaction-delete"`. Then
  Escape closes only the top layer.
- A drawer is never a confirmation. To confirm an action from a drawer, open a
  `ConfirmModal` on top of the drawer.
- Do not use `window.confirm()`. Do not make a modal with a hand-made scrim and
  `role="dialog"`.

## Styling conventions

- Use CSS Modules with PostCSS. See `stylelint.config.mjs` for the style rules.
- Put the CSS module file in the same folder as the component file that imports it. Give it
  the same name as the component file, with the extension `.module.css`. Example:
  `SpaceView.tsx` imports `SpaceView.module.css`.
- A CSS module has exactly one importer: the component file with the same name. Do not
  import a CSS module from a second file. To share styles, make a shared React component, not
  a shared class name. Duplicate CSS is acceptable.
- Use a `data-*` attribute for a modifier style, not one CSS class for each value. Do this
  when only one value can apply at a time. Give the attribute the modifier value, for example
  `data-variant="primary"`. Select it in the CSS module with an attribute selector on the
  base class, for example `&[data-variant="primary"] { ... }`. For a boolean modifier, set
  the attribute with `stringBool(...)` from `src/lib/stringBool.ts`. The attribute
  is then always the text `"true"` or `"false"`. Select it with `&[data-full-width="true"]`
  or `&[data-full-width="false"]`.
- Put each global z-index in `src/styles/tokens/z-index.css`. A global z-index is a
  z-index in the root stacking context. Give each layer a token with the name
  `--z-index--<layer>`, and read it with `z-index: var(--z-index--<layer>)`. Use steps of
  100, so a new layer can go between two layers. A CSS module can use a private z-index only
  in a stacking context that is not the root stacking context, for example with
  `isolation: isolate` on a container. Write a comment that names the component that makes
  the stacking context.
- Use logical properties for margin, padding, borders, and position. Do not use physical
  properties. Write `margin-inline-start`, not `margin-left`. Write `inset-block-start`, not
  `top`. Logical properties follow the writing direction, and they make the axis clear.
- Do not give a shorthand more than one value when the position of each value sets its side.
  The reader must then know the order of the sides. Write one declaration for each axis or
  side. A shorthand with one value is correct, because that value applies to all sides.

  ```css
  /* Not this */
  margin: 10px 20px;
  margin-inline: 0 auto;

  /* Do this */
  margin-block: 10px;
  margin-inline: 20px;
  margin-inline-start: 0;
  margin-inline-end: auto;

  /* Correct: one value for all sides */
  margin: 20px;
  ```

  Stylelint enforces both rules (`csstools/use-logical` and
  `declaration-property-value-disallowed-list`). `--fix` corrects a physical property, but
  not a shorthand.

- Use native CSS nesting. Nest a related selector (a pseudo-class, a descendant, a `@media`
  block) in the base selector that it belongs to.
- Put each style under the selector of the element that it changes, not under the selector
  of the ancestor that starts the change. Nest the ancestor selector in the target selector,
  with `&`.

  ```css
  /* Do this */
  .foo {
    .hidden & {
      display: none;
    }
  }

  /* Not this */
  .hidden {
    .foo {
      display: none;
    }
  }
  ```

  This is a guideline, not a strict rule. It does not apply to element selectors with no
  class, for example the tags of rich text. Nest these under their container class.

- Group CSS rules by selector, not by breakpoint. Do not collect media queries in one block
  at the end of the file. Nest each `@media` rule in the selector that it changes.

  ```css
  /* Do this */
  .header {
    margin-block-end: var(--spacing-m);

    @media (width <= 900px) {
      margin-block-end: var(--spacing-s);
    }
  }

  /* Not this */
  .header {
    margin-block-end: var(--spacing-m);
  }

  @media (width <= 900px) {
    .header {
      margin-block-end: var(--spacing-s);
    }
  }
  ```

## Unit testing conventions

- A mock that makes a unit testable is a code smell. If a test needs a mock, the unit has a
  tight coupling. Change the decomposition. Do not add a mock.
- Do not unit test I/O. A call through the PostgREST client, better-auth, or a network or
  file access is not a unit. Test the database with pgTAP.
- Keep logic in pure functions and test them directly, with no mocks. The same input gives
  the same output, with no side effects.
- Push I/O to the edges of a module (server functions, route loaders, database calls). Keep
  the pure logic on the inside. Unit test the inside.
- Do not try to get 100% code coverage. Code coverage does not show case coverage.
- Put a test file next to its source file: `name.test.ts`.

## Script conventions

These rules apply to the Node scripts, for example `src/scripts/migrateDatabase.ts`.

- Use top-level await. Do not put the script body in a `main` function. To stop early, put
  the remaining steps in an `if`/`else` block or in a named function: a module cannot
  `return` at the top level.
- Read flags with `parseArgs` from `node:util`. Give the script named flags only, for
  example `--space <id>`, not positional arguments. Do not write `--` before the flags in a
  usage line: Yarn 4 sends the `--` to the script, and `parseArgs` then refuses the flags.
- Let an error that the script does not handle go to Node. Do not catch it at the top level,
  or in a `process.on("uncaughtException")` handler, only to print a shorter message. Node
  prints the stack trace and exits with code 1.

## Quality gates

Run these after each change set:

```bash
yarn lint
yarn test
```

Run `yarn db:test` after each change in `db/`.
