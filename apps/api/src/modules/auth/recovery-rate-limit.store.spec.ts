import { PrismaService } from '../prisma/prisma.service';
import {
  RecoveryRateLimitStore,
  RECOVERY_UNAVAILABLE_MESSAGE,
  retryAfterSeconds,
  type RecoveryEndpoint,
} from './recovery-rate-limit.store';

const IP = '203.100.13.7';
const FORGOT = 'forgot-password' as RecoveryEndpoint;
const RESET = 'reset-password' as RecoveryEndpoint;

/**
 * Stateful double of the store's single `recovery_rate_limit_buckets` access
 * path: per-`(endpoint, ip)` windows, the `FOR UPDATE` read, and the
 * post-lock `clock_timestamp()` — mirroring the SP-105A/B serialized
 * doubles. Row ids are the bucket keys so `update`/`delete` resolve to the
 * right window. `now` is test-controlled; `vanishOn` emulates a row deleted
 * by a concurrent cleanup between the upsert and the lock.
 */
function database() {
  const state = {
    now: new Date('2026-10-15T12:00:00.000Z'),
    windows: new Map<string, Date[]>(),
    vanishOn: [] as number[],
    failRawWith: null as Error | null,
    failUpsertWith: null as Error | null,
  };
  const key = (endpoint: string, normalizedIp: string) => `${endpoint}:${normalizedIp}`;
  let lockReads = 0;

  interface BucketKey {
    endpoint: string;
    normalizedIp: string;
  }

  const upsert = jest.fn(
    async (args: { where: { endpoint_normalizedIp: BucketKey }; create: { admittedAt: Date[] } }) => {
      if (state.failUpsertWith) throw state.failUpsertWith;
      const k = key(args.where.endpoint_normalizedIp.endpoint, args.where.endpoint_normalizedIp.normalizedIp);
      if (!state.windows.has(k)) {
        state.windows.set(k, [...args.create.admittedAt]);
      }
      return { id: k, ...args.where.endpoint_normalizedIp };
    },
  );
  const update = jest.fn(
    async (args: { where: { id: string }; data: { admittedAt: Date[]; updatedAt: Date } }) => {
      const window = state.windows.get(args.where.id);
      if (!window) throw new Error('test: update on a missing bucket row');
      window.length = 0;
      window.push(...args.data.admittedAt);
      return { id: args.where.id, admittedAt: [...window], updatedAt: args.data.updatedAt };
    },
  );
  const create = jest.fn(
    async (args: { data: { endpoint: string; normalizedIp: string; admittedAt: Date[] } }) => {
      const k = key(args.data.endpoint, args.data.normalizedIp);
      state.windows.set(k, [...args.data.admittedAt]);
      return { ...args.data, id: k };
    },
  );
  const del = jest.fn(async (args: { where: { id: string } }) => {
    state.windows.delete(args.where.id);
    return { count: 1 };
  });
  const queryRaw = jest.fn(
    async (strings: { join: (sep: string) => string }, ...values: unknown[]) => {
      const sql = strings.join('?');
      if (sql.includes('clock_timestamp()')) {
        return [{ checkedAt: state.now }];
      }
      if (sql.includes('FOR UPDATE')) {
        lockReads += 1;
        if (state.failRawWith) throw state.failRawWith;
        if (state.vanishOn.includes(lockReads)) return [];
        const [endpoint, normalizedIp] = values as [string, string];
        const k = key(endpoint, normalizedIp);
        const window = state.windows.get(k);
        if (!window) return [];
        return [{ id: k, admittedAt: [...window] }];
      }
      throw new Error(`test: unexpected raw query: ${sql}`);
    },
  );

  const tx = {
    recoveryRateLimitBucket: { upsert, update, create, delete: del },
    $queryRaw: queryRaw,
  };

  const prisma = {
    $transaction: jest.fn(async (callback: (t: typeof tx) => Promise<unknown>) =>
      callback(tx),
    ),
  } as unknown as PrismaService;

  return {
    state,
    tx,
    prisma,
    make: () => new RecoveryRateLimitStore(prisma),
  };
}

type TestDb = ReturnType<typeof database>;

/** Seed `count` entries, the oldest `oldestAgoMs` back, spaced 1s apart. */
function seedWindow(db: TestDb, endpoint: RecoveryEndpoint, oldestAgoMs: number, count: number) {
  const base = db.state.now.getTime();
  db.state.windows.set(
    `${endpoint}:${IP}`,
    Array.from({ length: count }, (_, i) => new Date(base - (oldestAgoMs - i * 1000))),
  );
}

describe('RecoveryRateLimitStore', () => {
  it('admits the first 10 forgot-password requests from an IP and denies the 11th and 12th', async () => {
    const db = database();
    const store = db.make();
    const t0 = db.state.now.getTime();
    const results: boolean[] = [];
    for (let i = 1; i <= 12; i += 1) {
      db.state.now = new Date(t0 + i * 1000); // one request per second
      const decision = await store.admit(FORGOT, IP);
      results.push(decision.allowed);
    }

    expect(results).toEqual([
      true, true, true, true, true, true, true, true, true, true, false, false,
    ]);
    // The window stays bounded by the limit; denials appended nothing.
    expect(db.state.windows.get(`${FORGOT}:${IP}`)).toHaveLength(10);
  });

  it('enforces 30 for reset-password in a separate bucket from forgot-password', async () => {
    const db = database();
    const store = db.make();
    const t0 = db.state.now.getTime();

    // Reset bucket already full (30 admissions, newest 29s old); forgot empty.
    seedWindow(db, RESET, 29_000, 30);
    db.state.now = new Date(t0);

    await expect(store.admit(RESET, IP)).resolves.toMatchObject({
      allowed: false,
      retryAfterSeconds: expect.any(Number),
    });
    await expect(store.admit(FORGOT, IP)).resolves.toEqual({ allowed: true });
    expect(db.state.windows.get(`${FORGOT}:${IP}`)).toEqual([db.state.now]);
  });

  it('frees a slot exactly 60 seconds after an admission', async () => {
    const db = database();
    const store = db.make();
    const t0 = db.state.now.getTime();
    // 10 entries; the oldest is exactly one full window old → pruned, 9 remain.
    seedWindow(db, FORGOT, 60_000, 10);
    db.state.now = new Date(t0);

    await expect(store.admit(FORGOT, IP)).resolves.toEqual({ allowed: true });
    expect(db.tx.recoveryRateLimitBucket.update).toHaveBeenCalledTimes(1);
    expect(db.state.windows.get(`${FORGOT}:${IP}`)).toHaveLength(10);
  });

  it('denies while the oldest retained entry is still inside the window, without writing', async () => {
    const db = database();
    const store = db.make();
    const t0 = db.state.now.getTime();
    // 10 entries; the oldest is 59.999s old → all 10 retained.
    seedWindow(db, FORGOT, 59_999, 10);
    db.state.now = new Date(t0);

    const before = [...(db.state.windows.get(`${FORGOT}:${IP}`) ?? [])];
    const decision = await store.admit(FORGOT, IP);
    expect(decision).toMatchObject({ allowed: false });
    // No write on denial: the window is byte-identical.
    expect(db.state.windows.get(`${FORGOT}:${IP}`)).toEqual(before);
    expect(db.tx.recoveryRateLimitBucket.update).not.toHaveBeenCalled();
    expect(db.tx.recoveryRateLimitBucket.delete).not.toHaveBeenCalled();
    expect(db.tx.recoveryRateLimitBucket.create).not.toHaveBeenCalled();
  });

  it('derives Retry-After from the earliest retained admission', async () => {
    const db = database();
    const store = db.make();
    const t0 = db.state.now.getTime();
    // Oldest entry 30s old → 30s until it leaves the window.
    seedWindow(db, FORGOT, 30_000, 10);
    db.state.now = new Date(t0);

    await expect(store.admit(FORGOT, IP)).resolves.toEqual({
      allowed: false,
      retryAfterSeconds: 30,
    });
  });

  it('replaces a fully stale bucket instead of preserving it', async () => {
    const db = database();
    const store = db.make();
    const t0 = db.state.now.getTime();
    // All three entries are two windows old → the window prunes to empty.
    seedWindow(db, FORGOT, 122_000, 3);
    db.state.now = new Date(t0);

    await expect(store.admit(FORGOT, IP)).resolves.toEqual({ allowed: true });
    expect(db.tx.recoveryRateLimitBucket.delete).toHaveBeenCalledTimes(1);
    const created = db.tx.recoveryRateLimitBucket.create.mock.calls[0][0].data as {
      endpoint: string;
      normalizedIp: string;
      admittedAt: Date[];
    };
    expect(created).toEqual({
      endpoint: FORGOT,
      normalizedIp: IP,
      admittedAt: [db.state.now],
    });
  });

  it('appends in place on a live bucket and updates its timestamp', async () => {
    const db = database();
    const store = db.make();
    const t0 = db.state.now.getTime();
    // 3 entries, 12/11/10s old at t0.
    seedWindow(db, FORGOT, 12_000, 3);
    db.state.now = new Date(t0 + 5000); // checkedAt is 5s after seeding

    await expect(store.admit(FORGOT, IP)).resolves.toEqual({ allowed: true });
    const window = db.state.windows.get(`${FORGOT}:${IP}`) ?? [];
    expect(window).toHaveLength(4);
    expect(window[window.length - 1]).toEqual(db.state.now);
    const update = db.tx.recoveryRateLimitBucket.update.mock.calls[0][0] as {
      data: { admittedAt: Date[]; updatedAt: Date };
    };
    expect(update.data.updatedAt).toEqual(db.state.now);
  });

  it('retries once when the row disappears between upsert and lock, then fails closed', async () => {
    const db = database();
    db.state.vanishOn = [1, 2]; // both lock reads see no row
    const store = db.make();

    await expect(store.admit(FORGOT, IP)).rejects.toMatchObject({
      status: 503,
      message: RECOVERY_UNAVAILABLE_MESSAGE,
    });
    expect(db.tx.recoveryRateLimitBucket.upsert).toHaveBeenCalledTimes(2);
  });

  it('succeeds on the bounded retry when the row reappears', async () => {
    const db = database();
    db.state.vanishOn = [1]; // only the first lock read misses
    const store = db.make();

    await expect(store.admit(FORGOT, IP)).resolves.toEqual({ allowed: true });
    expect(db.tx.recoveryRateLimitBucket.upsert).toHaveBeenCalledTimes(2);
  });

  it('fails closed with a sanitized 503 when storage throws', async () => {
    const db = database();
    db.state.failRawWith = new Error('connection refused: host 10.0.0.5');
    const store = db.make();

    await expect(store.admit(FORGOT, IP)).rejects.toMatchObject({
      status: 503,
      message: RECOVERY_UNAVAILABLE_MESSAGE,
    });
    // The sanitized message reveals no address, endpoint, or database detail.
    expect(RECOVERY_UNAVAILABLE_MESSAGE).not.toContain(IP);
    expect(RECOVERY_UNAVAILABLE_MESSAGE).not.toContain('10.0.0.5');
    expect(RECOVERY_UNAVAILABLE_MESSAGE).not.toContain(FORGOT);
  });

  it('fails closed when the stored window is unparseable', async () => {
    const db = database();
    db.state.windows.set(`${FORGOT}:${IP}`, ['garbage'] as unknown as Date[]);
    const store = db.make();

    await expect(store.admit(FORGOT, IP)).rejects.toMatchObject({
      status: 503,
      message: RECOVERY_UNAVAILABLE_MESSAGE,
    });
  });

  it('writes only the four bucket fields — never emails, tokens, passwords, or bodies', async () => {
    const db = database();
    const store = db.make();

    await store.admit(RESET, IP);

    const writableFields = new Set(['endpoint', 'normalizedIp', 'admittedAt', 'updatedAt']);
    for (const call of [
      ...db.tx.recoveryRateLimitBucket.upsert.mock.calls,
      ...db.tx.recoveryRateLimitBucket.create.mock.calls,
      ...db.tx.recoveryRateLimitBucket.update.mock.calls,
    ]) {
      const args = call[0] as {
        create?: Record<string, unknown>;
        data?: Record<string, unknown>;
      };
      const written = [
        ...Object.keys(args.create ?? {}),
        ...Object.keys(args.data ?? {}),
      ];
      expect(written.length).toBeGreaterThan(0);
      for (const field of written) {
        expect(writableFields.has(field)).toBe(true);
      }
    }
  });
});

describe('retryAfterSeconds (parent retry wire contract)', () => {
  const now = new Date('2026-10-15T12:00:00.000Z');

  it.each([
    // [earliest entry age in ms, expected integer delta-seconds]
    [60_000, 1], // exactly elapsed → max(1, ceil(0))
    [59_400, 1], // 0.6s left → ceil → 1
    [59_001, 1], // 0.999s left → ceil → 1
    [30_000, 30],
    [1, 60], // just admitted → full 60s
    [0, 60], // clamped at the window top
  ])('earliest entry %ims old → Retry-After %is', async (ageMs, expected) => {
    expect(retryAfterSeconds(new Date(now.getTime() - ageMs), now)).toBe(expected);
  });
});
