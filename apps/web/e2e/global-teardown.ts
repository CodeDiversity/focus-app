import { resolveTestEnv, teardownTestDatabase } from './test-env';

/**
 * Playwright global teardown (SP-119): drops the throwaway `*_e2e_test`
 * database after the run (terminate backends first, then DROP) so no run data
 * outlives the run (AC2). Best-effort: a leftover namespaced database is
 * harmless and is reused by the next run; developer data is never at risk.
 *
 * In external-stack mode (`E2E_BASE_URL` set) this is a no-op — the caller
 * owns the stack and its database.
 */
export default async function globalTeardown(): Promise<void> {
  const env = resolveTestEnv();
  if (env.mode === 'external') {
    console.log('E2E: external-stack mode — skipping database teardown.');
    return;
  }
  await teardownTestDatabase(env);
}
