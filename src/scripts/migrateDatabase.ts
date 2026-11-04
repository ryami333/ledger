/**
 * Applies the missing files of `db/migrations` to the database of
 * DATABASE_URL. The web container runs it before the server starts
 * (deploy/compose.yaml). Locally, `yarn db:start` and `yarn db:reset` run it.
 *
 * It keeps the applied versions in `migrations.schema_migrations`.
 * Each file runs in one transaction with its row. An advisory lock stops two
 * runs at the same time. A second run changes nothing.
 *
 * At the end, it gives the role authenticator the password of DATABASE_URL,
 * so PostgREST can connect. Then PostgREST reloads its schema cache.
 */
import { env } from "../env.ts";
import { planMigrations } from "../core/migrations/planMigrations.ts";
import { readFile, readdir } from "node:fs/promises";
import pg from "pg";

const migrationsUrl = new URL("../../db/migrations/", import.meta.url);

/** A random number. Only this script takes this advisory lock. */
const advisoryLockKey = 7_301_445_112;

const client = new pg.Client({
  connectionString: env.DATABASE_URL,
  application_name: "ledger-migrate",
});
await client.connect();

try {
  await client.query("select pg_advisory_lock($1)", [advisoryLockKey]);
  await client.query(`
    create schema if not exists migrations;
    create table if not exists migrations.schema_migrations (
      version text primary key,
      statements text[],
      name text,
      applied_at timestamptz not null default now()
    );
  `);
  const { rows } = await client.query<{ version: string }>(
    "select version from migrations.schema_migrations",
  );
  const pending = planMigrations({
    fileNames: await readdir(migrationsUrl),
    appliedVersions: rows.map((row) => row.version),
  });
  if (pending.length === 0) {
    console.log("The database has all migrations.");
  }
  for (const migration of pending) {
    const sql = await readFile(new URL(migration.fileName, migrationsUrl), {
      encoding: "utf8",
    });
    const startedAt = performance.now();
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query(
        "insert into migrations.schema_migrations (version, statements, name) values ($1, $2, $3)",
        [migration.version, [sql], migration.name],
      );
      await client.query("commit");
    } catch (err) {
      await client.query("rollback");
      throw err;
    }
    console.log(`Applied migration ${migration.version}`, {
      name: migration.name,
      durationMs: Math.round(performance.now() - startedAt),
    });
  }
  // The password is not in a migration file, because it is a secret. pg gives
  // client.password from DATABASE_URL or PGPASSWORD.
  if (typeof client.password !== "string" || client.password === "") {
    throw new Error("DATABASE_URL or PGPASSWORD must give a password.");
  }
  await client.query(
    `alter role authenticator password ${client.escapeLiteral(client.password)}`,
  );
  // PostgREST listens on the channel pgrst. Plain Postgres has no event
  // trigger that sends this notification after a schema change.
  await client.query("notify pgrst, 'reload schema'");
} finally {
  await client.end();
}
