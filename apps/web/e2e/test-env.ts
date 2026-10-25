/**
 * Self-contained E2E environment (SP-119).
 *
 * Derives everything a self-contained run needs from the API's own
 * environment — the same files and the same non-override semantics the API's
 * ConfigModule uses (`apps/api/src/app.module.ts`: `envFilePath:
 * ['.env.local', '.env']`) — so no human or agent ever opens a secret file:
 * the values are loaded programmatically here.
 *
 * Sanitization policy (D119-2): the configured and derived database URLs are
 * never printed. Failure messages may name the env file/variable, the
 * database *name*, and host:port — never user/password or a full URL.
 *
 * Self-contained mode (default): a throwaway `<dev-db>_e2e_test` database
 * (created + migrated in global setup, dropped in global teardown) with
 * test-only API (:4100) and web (:3100) instances; the developer stack is
 * neither required nor touched.
 * External-stack mode (`E2E_BASE_URL` set): the caller provides the stack and
 * its database — no servers, no database lifecycle (SP-116 AC2 semantics).
 */
import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as dotenv from 'dotenv';
import postgres from 'postgres';

/** This file lives in `apps/web/e2e`; the workspace layout is fixed. */
const apiDir = path.resolve(__dirname, '../../api');

/** Test-only ports (kept clear of the dev stack's 3000/4000). */
export const E2E_API_PORT = 4100;
export const E2E_WEB_PORT = 3100;

/** Browser base URL for the self-contained web instance. */
export const SELF_CONTAINED_BASE_URL = `http://localhost:${E2E_WEB_PORT}`;

/** Self-contained run: dedicated throwaway database + test-only servers. */
export interface SelfContainedEnv {
  mode: 'self-contained';
  /** The configured (developer) database URL — internal use only, never printed. */
  configuredDatabaseUrl: string;
  /** Derived throwaway database URL: same credentials/host, renamed database. */
  testDatabaseUrl: string;
  devDatabaseName: string;
  testDatabaseName: string;
  host: string;
  port: number;
}

/** External-stack run (`E2E_BASE_URL` set): no servers, no database lifecycle. */
export interface ExternalEnv {
  mode: 'external';
  baseUrl: string;
}

export type TestEnv = SelfContainedEnv | ExternalEnv;

/**
 * Loads the API's environment files with the exact semantics of the API's
 * ConfigModule (@nestjs/config v3): every existing file is parsed and merged
 * (`.env.local` wins over `.env`), and only keys absent from `process.env`
 * are applied — an explicit shell variable always wins, exactly as in the API.
 */
function loadApiEnv(): void {
  let config: Record<string, string> = {};
  for (const file of [path.join(apiDir, '.env.local'), path.join(apiDir, '.env')]) {
    if (fs.existsSync(file)) {
      config = { ...dotenv.parse(fs.readFileSync(file)), ...config };
    }
  }
  for (const key of Object.keys(config)) {
    if (!(key in process.env)) {
      process.env[key] = config[key];
    }
  }
}

/**
 * Resolves the E2E environment. Throws an actionable error (before the first
 * test) when a self-contained run cannot be prepared.
 */
export function resolveTestEnv(): TestEnv {
  const externalBaseUrl = process.env.E2E_BASE_URL;
  if (externalBaseUrl) {
    return { mode: 'external', baseUrl: externalBaseUrl };
  }

  loadApiEnv();
  const configured = process.env.DATABASE_URL;
  if (!configured) {
    throw new Error(
      'E2E setup failed: DATABASE_URL is not set. Create apps/api/.env.local with a ' +
        'DATABASE_URL pointing at an existing Postgres database (see apps/api/.env.example), ' +
        'then re-run `pnpm test:e2e`.'
    );
  }

  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new Error(
      'E2E setup failed: DATABASE_URL in apps/api/.env.local is not a valid URL. ' +
        'It must be postgres(ql)://user:password@host:port/database — fix it, then re-run `pnpm test:e2e`.'
    );
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error(
      `E2E setup failed: DATABASE_URL in apps/api/.env.local uses the "${url.protocol}" protocol — ` +
        'E2E requires a PostgreSQL database URL. Fix it, then re-run `pnpm test:e2e`.'
    );
  }

  const devDatabaseName = decodeURIComponent(url.pathname.slice(1));
  if (!devDatabaseName || devDatabaseName.includes('/')) {
    throw new Error(
      'E2E setup failed: DATABASE_URL in apps/api/.env.local does not name a database. ' +
        'It must end with /<database> — fix it, then re-run `pnpm test:e2e`.'
    );
  }

  // Rename the database to the namespaced throwaway (the `_test`-suffix
  // convention of recovery-db-harness.ts); host/port/credentials are kept.
  const testDatabaseName = `${devDatabaseName}_e2e_test`;
  const testUrl = new URL(configured);
  testUrl.pathname = `/${testDatabaseName}`;

  return {
    mode: 'self-contained',
    configuredDatabaseUrl: configured,
    testDatabaseUrl: testUrl.toString(),
    devDatabaseName,
    testDatabaseName,
    host: url.hostname || 'localhost',
    port: url.port ? Number(url.port) : 5432,
  };
}

/**
 * Masks credentials in text that may be echoed into a failure message:
 * `postgres://user:password@…` → `postgres://***@…`, `password=…` → `password=***`.
 */
export function sanitizeForMessage(text: string): string {
  return text
    .replace(/(postgres(?:ql)?):\/\/[^/@\s]+@/gi, '$1:***@')
    .replace(/(password=)[^&\s]+/gi, '$1***');
}

/**
 * A single-connection pjs client for the lifecycle work (create/migrate/drop).
 * The `?schema=` URL parameter (Prisma-specific — `@prisma/adapter-pg` uses it
 * to qualify table names) is stripped: pjs forwards unknown URL parameters as
 * server startup options, and the server rejects `schema`. It has no effect on
 * the lifecycle queries, which never touch user tables.
 */
function connect(url: string) {
  const pjsUrl = new URL(url);
  pjsUrl.searchParams.delete('schema');
  return postgres(pjsUrl.toString(), { max: 1, idle_timeout: 0, connect_timeout: 10 });
}

type SqlClient = ReturnType<typeof postgres>;

/** Runs `body` on a fresh single-connection client and always closes it. */
async function withClient(url: string, body: (sql: SqlClient) => Promise<void>): Promise<void> {
  const sql = connect(url);
  try {
    await body(sql);
  } finally {
    // pjs pools stay alive (idle_timeout 0) — close even when the body failed.
    await sql.end({ timeout: 5 }).catch(() => undefined);
  }
}

/** Double-quotes a PostgreSQL identifier (database names). */
function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/** Single-quotes a PostgreSQL string literal. */
function quoteLiteral(name: string): string {
  return `'${name.replace(/'/g, "''")}'`;
}

/**
 * Distinguishes the two AC3 fail-fast cases from the raw setup error:
 * `3D000` (invalid_catalog_name) means Postgres is up but the configured dev
 * database is missing; anything else is reported as Postgres unreachable.
 * Only the database name and host:port are named — never credentials/URL.
 */
function describeDatabaseSetupFailure(env: SelfContainedEnv, error: unknown): Error {
  const code = (error as { code?: string } | null)?.code;
  if (code === '3D000') {
    return new Error(
      `E2E setup failed: the configured dev database "${env.devDatabaseName}" does not exist ` +
        `at ${env.host}:${env.port}. Create it (e.g. \`createdb ${env.devDatabaseName}\`) or fix ` +
        'DATABASE_URL in apps/api/.env.local, then re-run `pnpm test:e2e`.'
    );
  }
  const detail = error instanceof Error ? error.message : String(error);
  return new Error(
    `E2E setup failed: Postgres is unreachable at ${env.host}:${env.port} ` +
      `(${sanitizeForMessage(detail)}). Ensure Postgres is running, then re-run \`pnpm test:e2e\`.`
  );
}

/**
 * Applies the migrations to the throwaway database: the workspace prisma
 * binary from `apps/api` (O-3 — not a bare `npx prisma` from `apps/web`), run
 * with the derived URL as an explicit env var — Prisma 7 reads it via
 * `prisma.config.ts`, and an explicit variable wins over any dotenv the CLI
 * loads itself.
 */
function runMigrateDeploy(env: SelfContainedEnv): Promise<void> {
  const prismaCli = path.join(apiDir, 'node_modules', 'prisma', 'build', 'index.js');
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [prismaCli, 'migrate', 'deploy'], {
      cwd: apiDir,
      env: { ...process.env, DATABASE_URL: env.testDatabaseUrl },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    const collect = (chunk: Buffer | string) => {
      output += String(chunk);
    };
    child.stdout?.on('data', collect);
    child.stderr?.on('data', collect);
    child.on('error', (error) => {
      reject(
        new Error(
          `E2E setup failed: could not start the Prisma CLI (${sanitizeForMessage(error.message)}). ` +
            'Run `pnpm install` and `pnpm db:generate` in the repo root, then re-run `pnpm test:e2e`.'
        )
      );
    });
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `E2E setup failed: \`prisma migrate deploy\` exited with code ${code} against the ` +
            `throwaway database "${env.testDatabaseName}".\n${sanitizeForMessage(output.slice(-2000))}`
        )
      );
    });
  });
}

/**
 * Global setup database work (AC3): verify Postgres reachability and the
 * configured database, create the throwaway database idempotently, apply the
 * migrations.
 */
export async function setupTestDatabase(env: SelfContainedEnv): Promise<void> {
  // 1. Connect to the *configured* database first: this is what distinguishes
  //    "Postgres unreachable" from "configured dev database missing".
  await withClient(env.configuredDatabaseUrl, async (sql) => {
    try {
      await sql`SELECT 1`;
    } catch (error) {
      throw describeDatabaseSetupFailure(env, error);
    }
  });

  // 2. Create the throwaway database if missing (idempotent). Postgres has no
  //    CREATE DATABASE IF NOT EXISTS — check pg_database first; 42P04 covers
  //    the race where a concurrent run created it in between.
  await withClient(env.configuredDatabaseUrl, async (sql) => {
    const existing = await sql`SELECT 1 FROM pg_database WHERE datname = ${env.testDatabaseName}`;
    if (existing.length === 0) {
      try {
        await sql.unsafe(`CREATE DATABASE ${quoteIdent(env.testDatabaseName)}`);
      } catch (error) {
        if ((error as { code?: string } | null)?.code !== '42P04') {
          throw new Error(
            `E2E setup failed: could not create the throwaway database "${env.testDatabaseName}" ` +
              `(${sanitizeForMessage(error instanceof Error ? error.message : String(error))}).`
          );
        }
      }
    }
  });

  // 3. Apply the migrations to the throwaway database.
  await runMigrateDeploy(env);
}

/**
 * Global teardown database work (AC2): terminate any backends still attached
 * to the throwaway database, then drop it (idempotent). Best-effort by design
 * — a leftover namespaced `*_e2e_test` database is harmless (the next run
 * reuses and re-migrates it); developer data is never at risk either way.
 */
export async function teardownTestDatabase(env: SelfContainedEnv): Promise<void> {
  try {
    await withClient(env.configuredDatabaseUrl, async (sql) => {
      // DROP DATABASE requires zero connections to the target — terminate any
      // remaining backends first. The client itself connects to the
      // *configured* database, never the one being dropped (O-5).
      await sql.unsafe(
        `SELECT pg_terminate_backend(pid) FROM pg_stat_activity ` +
          `WHERE datname = ${quoteLiteral(env.testDatabaseName)} AND pid <> pg_backend_pid()`
      );
      await sql.unsafe(`DROP DATABASE IF EXISTS ${quoteIdent(env.testDatabaseName)}`);
    });
    console.log(`E2E: throwaway database "${env.testDatabaseName}" dropped.`);
  } catch (error) {
    console.warn(
      `E2E teardown warning: could not drop the throwaway database "${env.testDatabaseName}" ` +
        `(${sanitizeForMessage(error instanceof Error ? error.message : String(error))}). ` +
        'It is namespaced and will be reused by the next run; developer data is unaffected.'
    );
  }
}
