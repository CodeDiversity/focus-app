import { createHash, randomBytes, randomUUID } from 'crypto';
import { setTimeout as delay } from 'timers/promises';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../../../generated/prisma/client';
import type { RecoveryEndpoint } from '../recovery-rate-limit.store';

/** Explicit disposable database only; never consult DATABASE_URL or expose input. */
export function testDatabaseUrl(value: string | undefined): string {
  try {
    if (!value) throw new Error();
    const url = new URL(value);
    const name = decodeURIComponent(url.pathname.slice(1));
    if (
      !['postgres:', 'postgresql:'].includes(url.protocol) ||
      !url.hostname ||
      !name.endsWith('_test') ||
      name.includes('/') ||
      name === '_test'
    ) {
      throw new Error();
    }
    return value;
  } catch {
    throw new Error(
      'TEST_DATABASE_URL must select a disposable PostgreSQL database ending in _test'
    );
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

export interface HeldTransaction {
  readonly pid: number;
  /** Idempotent release; waits for commit or reports sanitized transaction failure. */
  release(): Promise<void>;
}

/** Test-only lifecycle. Prefer run() so failed bodies always clean up. No global deletes. */
export class RecoveryDbHarness {
  private readonly clients: PrismaClient[] = [];
  private readonly owners: string[] = [];
  private readonly buckets: { endpoint: string; normalizedIp: string }[] = [];
  private readonly held: HeldTransaction[] = [];
  readonly client: PrismaClient;

  private constructor(private readonly target: string) {
    this.client = this.newClient();
  }

  private newClient(): PrismaClient {
    const client = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: this.target,
        connectionTimeoutMillis: 3_000,
        statement_timeout: 10_000,
      }),
      log: [],
    });
    this.clients.push(client);
    return client;
  }

  static async create(): Promise<RecoveryDbHarness> {
    const harness = new RecoveryDbHarness(testDatabaseUrl(process.env.TEST_DATABASE_URL));
    try {
      await harness.client.$connect();
      return harness;
    } catch {
      await harness.close();
      throw new Error(
        'Recovery test database unavailable; configure TEST_DATABASE_URL and apply migrations'
      );
    }
  }

  static async run<T>(body: (harness: RecoveryDbHarness) => Promise<T>): Promise<T> {
    const harness = await RecoveryDbHarness.create();
    try {
      return await body(harness);
    } finally {
      await harness.close();
    }
  }

  /** A separate pool/client for service replicas or concurrent interactive transactions. */
  async connection(): Promise<PrismaClient> {
    const client = this.newClient();
    try {
      await client.$connect();
      return client;
    } catch {
      throw new Error('Recovery test database connection failed');
    }
  }

  /** Seed credential hashes only. Generated raw credentials remain in the returned memory. */
  async seed(
    options: {
      bucket?: boolean;
      endpoint?: RecoveryEndpoint;
      expiresAt?: Date;
      usedAt?: Date;
      revokedAt?: Date;
      admittedAt?: Date[];
      passwordHash?: string;
    } = {}
  ) {
    const userId = randomUUID();
    const refreshToken = randomBytes(32).toString('base64url');
    const resetToken = randomBytes(32).toString('base64url');
    const digest = (raw: string) => createHash('sha256').update(raw).digest('hex');
    const expiresAt = options.expiresAt ?? new Date(Date.now() + 3_600_000);
    // Track before writes, so partial setup and transaction uncertainty are cleanable.
    this.owners.push(userId);
    const endpoint = options.endpoint ?? 'forgot-password';
    const normalizedIp = `2001:db8:${randomBytes(12).toString('hex').match(/.{4}/g)!.join(':')}`;
    try {
      await this.client.user.create({
        data: {
          id: userId,
          email: `${userId}@recovery.test`,
          name: 'Recovery fixture',
          passwordHash: options.passwordHash ?? digest(randomBytes(32).toString('hex')),
          refreshTokens: {
            create: {
              familyId: randomUUID(),
              tokenHash: digest(refreshToken),
              expiresAt,
              revokedAt: options.revokedAt,
            },
          },
          passwordResetTokens: {
            create: { tokenHash: digest(resetToken), expiresAt, usedAt: options.usedAt },
          },
        },
      });
      if (options.bucket) {
        this.buckets.push({ endpoint, normalizedIp });
        await this.client.recoveryRateLimitBucket.create({
          data: { endpoint, normalizedIp, admittedAt: options.admittedAt ?? [] },
        });
      }
      return { userId, refreshToken, resetToken, endpoint, normalizedIp };
    } catch {
      throw new Error('Recovery fixture setup failed; apply all migrations to the test database');
    }
  }

  /** Hold any parameterized owner/bucket lock callback until explicit release (10s cap). */
  async hold(
    acquire: (tx: Prisma.TransactionClient) => Promise<unknown>
  ): Promise<HeldTransaction> {
    const client = await this.connection();
    const acquired = deferred<number>();
    const released = deferred<void>();
    const done = client
      .$transaction(
        async (tx) => {
          const [row] = await tx.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`;
          await acquire(tx);
          acquired.resolve(row.pid);
          await released.promise;
        },
        { timeout: 12_000, maxWait: 3_000 }
      )
      .catch(() => {
        const error = new Error('Recovery held transaction failed or timed out');
        acquired.reject(error);
        throw error;
      });
    void done.catch(() => undefined);
    const timer = setTimeout(() => released.resolve(), 10_000);
    const handle = {
      pid: 0,
      release: async () => {
        clearTimeout(timer);
        released.resolve();
        await done;
      },
    };
    this.held.push(handle);
    handle.pid = await acquired.promise;
    return handle;
  }

  /** Observe actual PostgreSQL blocking, never infer contention from a fixed sleep. */
  async waitUntilBlocked(contenderPid: number, holderPid: number): Promise<void> {
    const deadline = Date.now() + 5_000;
    try {
      while (Date.now() < deadline) {
        const [row] = await this.client.$queryRaw<{ blocked: boolean }[]>`
          SELECT ${holderPid}::int = ANY(pg_blocking_pids(${contenderPid}::int)) AS blocked
        `;
        if (row.blocked) return;
        await delay(10);
      }
    } catch {
      throw new Error('Recovery lock observation failed');
    }
    throw new Error('Recovery contender did not block before the deadline');
  }

  /** Release transactions first, remove tracked keys/owners, then disconnect every client. */
  async close(): Promise<void> {
    let failed = false;
    const releases = await Promise.allSettled(this.held.map((held) => held.release()));
    failed ||= releases.some((result) => result.status === 'rejected');
    try {
      for (const key of this.buckets) {
        await this.client.recoveryRateLimitBucket.deleteMany({ where: key });
      }
      if (this.owners.length) {
        await this.client.user.deleteMany({ where: { id: { in: this.owners } } });
      }
    } catch {
      failed = true;
    } finally {
      const results = await Promise.allSettled(this.clients.map((client) => client.$disconnect()));
      failed ||= results.some((result) => result.status === 'rejected');
    }
    if (failed) throw new Error('Recovery database teardown failed');
  }
}
