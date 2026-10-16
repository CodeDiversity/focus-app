import { lockOwner } from '../owner-lock';
import { RecoveryDbHarness, testDatabaseUrl } from './recovery-db-harness';

describe('Recovery PostgreSQL harness', () => {
  jest.setTimeout(25_000);

  it('rejects missing, malformed and non-test database targets', () => {
    for (const value of [
      undefined,
      '',
      'invalid',
      'https://localhost/app_test',
      'postgresql://localhost/app',
      'postgresql://localhost/app_test/extra',
    ]) {
      expect(() => testDatabaseUrl(value)).toThrow('TEST_DATABASE_URL');
    }
    const target = 'postgresql://localhost/recovery_test';
    expect(testDatabaseUrl(target)).toBe(target);
  });

  it('cleans up its fixtures after a test body throws and preserves another owner', async () => {
    const other = await RecoveryDbHarness.create();
    try {
      const survivor = await other.seed({ bucket: true });
      let removedId!: string;
      let removedBucket!: string;
      await expect(
        RecoveryDbHarness.run(async (harness) => {
          const fixture = await harness.seed({ bucket: true });
          removedId = fixture.userId;
          removedBucket = fixture.normalizedIp;
          // A body failure while holding a transaction must still release it.
          await harness.hold((tx) => lockOwner(tx, fixture.userId));
          throw new Error('controlled body failure');
        })
      ).rejects.toThrow('controlled body failure');
      expect(await other.client.user.count({ where: { id: removedId } })).toBe(0);
      expect(await other.client.refreshToken.count({ where: { userId: removedId } })).toBe(0);
      expect(await other.client.passwordResetToken.count({ where: { userId: removedId } })).toBe(0);
      expect(
        await other.client.recoveryRateLimitBucket.count({ where: { normalizedIp: removedBucket } })
      ).toBe(0);
      expect(await other.client.user.count({ where: { id: survivor.userId } })).toBe(1);
      expect(await other.client.refreshToken.count({ where: { userId: survivor.userId } })).toBe(1);
      expect(
        await other.client.passwordResetToken.count({ where: { userId: survivor.userId } })
      ).toBe(1);
      expect(
        await other.client.recoveryRateLimitBucket.count({
          where: { normalizedIp: survivor.normalizedIp },
        })
      ).toBe(1);
    } finally {
      await other.close();
    }
  });

  it('waits for a held owner lock and proceeds after release', async () => {
    await RecoveryDbHarness.run(async (harness) => {
      const fixture = await harness.seed();
      const held = await harness.hold((tx) => lockOwner(tx, fixture.userId));
      let contender: Promise<unknown> | undefined;
      try {
        const second = await harness.connection();
        let started!: (pid: number) => void;
        const pid = new Promise<number>((resolve) => {
          started = resolve;
        });
        contender = second.$transaction(
          async (tx) => {
            const [row] = await tx.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`;
            started(row.pid);
            return lockOwner(tx, fixture.userId);
          },
          { timeout: 10_000 }
        );
        // Attach immediately so a transaction failure cannot become unhandled.
        void contender.catch(() => undefined);
        await harness.waitUntilBlocked(await pid, held.pid);
        await held.release();
        expect(await contender).toBe(true);
      } finally {
        await held.release();
        if (contender) await contender;
      }
    });
  });
});
