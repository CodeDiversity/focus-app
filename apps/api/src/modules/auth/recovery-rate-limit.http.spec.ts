import { v4 as uuidv4 } from 'uuid';
import { appCorsOptions } from '../../common/cors';
import { createIntegrationApp, type IntegrationApp } from '../../test/test-http';
import { RATE_LIMITED_MESSAGE } from './recovery-rate-limit.guard';
import { INVALID_RESET_MESSAGE } from './password-reset.service';

// Real-database suite: self-skips when DATABASE_URL is unset (bare local
// `pnpm test` without Docker), and always runs in CI, which provides a
// Postgres and applies migrations before the suite.
const describeIntegration = process.env.DATABASE_URL ? describe : describe.skip;

const FORGOT_GENERIC_MESSAGE =
  'If an account exists for that email address, a password reset link has been sent. Check your inbox and wait a minute before requesting another.';

const SPA_ORIGIN = process.env.FRONTEND_URL || 'http://localhost:3000';

/** 43-character base64url token (shape-valid, value-unknown). */
function randomToken(): string {
  return Buffer.from(uuidv4() + uuidv4())
    .toString('base64url')
    .slice(0, 43);
}

describeIntegration('recovery per-IP limits (integration, real database)', () => {
  let integration: IntegrationApp;
  let runId: string;
  let email: string;

  beforeAll(async () => {
    runId = uuidv4().slice(0, 8);
    email = `user-${runId}@example.com`; // unknown account — A still answers 200 generic
    integration = await createIntegrationApp();
  });

  afterAll(async () => {
    await integration?.app.close();
  });

  // All requests in this spec share the test client's single source IP, so
  // each test starts from empty recovery buckets for both endpoints.
  beforeEach(async () => {
    await integration.prisma.recoveryRateLimitBucket.deleteMany({
      where: { endpoint: { in: ['forgot-password', 'reset-password'] } },
    });
  });

  /** Supertest bound to the real HTTP application (main.ts parity). */
  function http() {
    return integration.request(integration.app.getHttpAdapter().getInstance());
  }

  /** The normalized IP the server actually sees for this test client. */
  async function clientIp(): Promise<string> {
    await http().post('/auth/forgot-password').send({ email });
    const row = await integration.prisma.recoveryRateLimitBucket.findFirst({
      where: { endpoint: 'forgot-password' },
    });
    if (!row) throw new Error('test: probe request did not create a bucket row');
    return row.normalizedIp;
  }

  it('admits 10 forgot-password requests from one IP, then 429s with Retry-After, the envelope, and CORS exposure', async () => {
    const origin = appCorsOptions().origin;
    const statuses: number[] = [];

    for (let i = 1; i <= 11; i += 1) {
      // Origin + Cookie: the real SPA calls /auth cross-origin with
      // credentials (its refresh cookie lives on Path=/auth), so the test
      // mirrors the browser; with credentials enabled the cors package
      // answers every actual response with Allow-Credentials: true.
      const res = await http()
        .post('/auth/forgot-password')
        .set('Origin', SPA_ORIGIN)
        .set('Cookie', 'refresh_token=probe')
        .send({ email })
        .expect('Content-Type', /json/);
      statuses.push(res.status);

      if (i < 11) {
        // Admitted requests keep A's exact contract — same generic 200.
        expect(res.body).toEqual({ message: FORGOT_GENERIC_MESSAGE });
        expect(res.headers['retry-after']).toBeUndefined();
      } else {
        // The filtered 429: standard envelope, no account state leaked.
        expect(res.body).toEqual({
          statusCode: 429,
          message: RATE_LIMITED_MESSAGE,
          error: 'Too Many Requests',
          path: '/auth/forgot-password',
          timestamp: expect.any(String),
        });
        const retryAfter = Number(res.headers['retry-after']);
        expect(Number.isInteger(retryAfter)).toBe(true);
        expect(retryAfter).toBeGreaterThanOrEqual(1);
        expect(retryAfter).toBeLessThanOrEqual(60);
        // CORS (PR-001): the separate-origin SPA can read the guidance.
        expect(res.headers['access-control-allow-origin']).toBe(origin);
        expect(res.headers['access-control-allow-credentials']).toBe('true');
        expect(res.headers['access-control-expose-headers']).toContain('Retry-After');
      }
    }

    expect(statuses).toEqual([200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 429]);
  });

  it('429s reset-password from a full 30-window and mutates nothing', async () => {
    const ip = await clientIp();
    const base = Date.now();
    const window = Array.from({ length: 30 }, (_, i) => new Date(base - (29 - i) * 1000));
    // upsert: the probe above may already have created this bucket.
    await integration.prisma.recoveryRateLimitBucket.upsert({
      where: { endpoint_normalizedIp: { endpoint: 'reset-password', normalizedIp: ip } },
      create: { endpoint: 'reset-password', normalizedIp: ip, admittedAt: window },
      update: { admittedAt: window },
    });

    const tokensBefore = await integration.prisma.passwordResetToken.count();
    const res = await http()
      .post('/auth/reset-password')
      .set('Origin', SPA_ORIGIN)
      .send({ token: randomToken(), password: 'Password123', confirmPassword: 'Password123' })
      .expect('Content-Type', /json/);

    expect(res.status).toBe(429);
    expect(res.body.message).toBe(RATE_LIMITED_MESSAGE);
    const retryAfter = Number(res.headers['retry-after']);
    expect(Number.isInteger(retryAfter)).toBe(true);
    expect(retryAfter).toBeGreaterThanOrEqual(1);
    expect(retryAfter).toBeLessThanOrEqual(60);

    // No mutation on denial: no user for this marker email …
    expect(await integration.prisma.user.findMany({ where: { email } })).toHaveLength(0);
    // … no reset tokens appeared (before/after — other spec files may share
    // the CI database in parallel) …
    expect(await integration.prisma.passwordResetToken.count()).toBe(tokensBefore);
    // … and the window is unchanged (a denial never prolongs it).
    const bucket = await integration.prisma.recoveryRateLimitBucket.findUnique({
      where: { endpoint_normalizedIp: { endpoint: 'reset-password', normalizedIp: ip } },
    });
    expect(bucket?.admittedAt).toHaveLength(30);
  });

  it('keeps the two endpoint buckets independent', async () => {
    const ip = await clientIp();
    const base = Date.now();
    const window = Array.from({ length: 10 }, (_, i) => new Date(base - (9 - i) * 1000));
    // upsert: the probe above already created this bucket with one admission.
    await integration.prisma.recoveryRateLimitBucket.upsert({
      where: { endpoint_normalizedIp: { endpoint: 'forgot-password', normalizedIp: ip } },
      create: { endpoint: 'forgot-password', normalizedIp: ip, admittedAt: window },
      update: { admittedAt: window },
    });

    // forgot is now over limit …
    const forgot = await http().post('/auth/forgot-password').send({ email });
    expect(forgot.status).toBe(429);

    // … while reset traffic from the same IP is still admitted into B's
    // uniform 400 (unknown token) — never a 429 from the other bucket.
    const reset = await http()
      .post('/auth/reset-password')
      .send({ token: randomToken(), password: 'Password123', confirmPassword: 'Password123' });
    expect(reset.status).toBe(400);
    expect(reset.body.message).toBe(INVALID_RESET_MESSAGE);
  });

  it('stores only endpoint, IP, and window timestamps in the bucket', async () => {
    const marker = `marker-${runId}@example.com`;
    for (let i = 0; i < 3; i += 1) {
      await http().post('/auth/forgot-password').send({ email: marker });
    }

    const rows = await integration.prisma.recoveryRateLimitBucket.findMany({
      where: { endpoint: 'forgot-password' },
    });
    expect(rows).toHaveLength(1);
    const row = rows[0];
    // Exactly the four columns — no emails, tokens, or bodies anywhere.
    expect(Object.keys(row).sort()).toEqual([
      'admittedAt',
      'endpoint',
      'id',
      'normalizedIp',
      'updatedAt',
    ]);
    expect(row.normalizedIp).toMatch(/^[0-9a-f.:]+$/i);
    expect(row.admittedAt).toHaveLength(3);
    expect(JSON.stringify(rows)).not.toContain(marker);
  });

  it('admitted reset traffic reaches B and returns its uniform invalid-link 400', async () => {
    const res = await http()
      .post('/auth/reset-password')
      .send({ token: randomToken(), password: 'Password123', confirmPassword: 'Password123' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe(INVALID_RESET_MESSAGE);
    expect(res.headers['retry-after']).toBeUndefined();
  });
});
