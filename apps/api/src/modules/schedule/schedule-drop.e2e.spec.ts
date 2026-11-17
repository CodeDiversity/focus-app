import { createIntegrationApp, IntegrationApp } from '../../test/test-http';

const describeIntegration = process.env.DATABASE_URL ? describe : describe.skip;

/**
 * EP15I (AC1, TR-E15-09): after all migrations run, the retired
 * `availability_slots` table is gone and the replacement tables exist.
 * EP15A's copy round-trip spec was deleted with the table — it seeded the
 * dropped model, so it cannot run after Migration 2 by design; its gated
 * pass is recorded in docs/stories/EP15/artifacts/EP15A/implementation.md
 * and the copy statement stays readable in Migration 1's SQL.
 */
describeIntegration('EP15I — availability_slots is dropped', () => {
  let app: IntegrationApp;

  beforeAll(async () => {
    app = await createIntegrationApp();
  }, 120_000);

  afterAll(async () => {
    if (app) await app.app.close();
  }, 60_000);

  it('the migrated schema has no availability_slots table; schedule tables remain', async () => {
    const names = await app.prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('availability_slots', 'schedule_blocks', 'day_bounds', 'schedule_block_exceptions')
    `;
    const present = names.map((r) => r.table_name).sort();
    expect(present).toEqual(['day_bounds', 'schedule_block_exceptions', 'schedule_blocks']);
  });

  it('the old /availability-slots routes are gone (uniform 404 surface)', async () => {
    const res = await app
      .request(app.app.getHttpAdapter().getInstance())
      .get('/availability-slots');
    expect(res.status).toBe(404);
  });
});
