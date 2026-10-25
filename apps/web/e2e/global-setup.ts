import { E2E_API_PORT, E2E_WEB_PORT, resolveTestEnv, setupTestDatabase } from './test-env';

/**
 * Playwright global setup (SP-119): prepares the self-contained run before
 * the first test — verifies Postgres reachability and the configured database
 * (fail-fast with a distinct actionable message, AC3), creates the throwaway
 * `*_e2e_test` database, and applies the migrations.
 *
 * In external-stack mode (`E2E_BASE_URL` set) this is a no-op: the caller
 * provides the stack and its database (SP-116 AC2 semantics).
 */
export default async function globalSetup(): Promise<void> {
  const env = resolveTestEnv();
  if (env.mode === 'external') {
    console.log(
      'E2E: external-stack mode (E2E_BASE_URL set) — skipping self-contained servers and database lifecycle.'
    );
    return;
  }
  console.log(
    `E2E: self-contained mode — preparing throwaway database "${env.testDatabaseName}" at ${env.host}:${env.port}...`
  );
  await setupTestDatabase(env);
  console.log(
    `E2E: throwaway database ready — test API on :${E2E_API_PORT}, test web on :${E2E_WEB_PORT} (dev stack untouched).`
  );
}
