import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { v4 as uuidv4 } from 'uuid';

import { createIntegrationApp, IntegrationApp } from '../../test/test-http';

const describeIntegration = process.env.DATABASE_URL ? describe : describe.skip;

const MIGRATION_SQL = join(
  __dirname,
  '../../../prisma/migrations/20261117120000_schedule_blocks_and_day_bounds/migration.sql'
);

/** The copy statement exactly as the migration runs it (between the markers). */
function copyStatement(): string {
  const sql = readFileSync(MIGRATION_SQL, 'utf8');
  // Whole-line markers only: the header prose names them too.
  const match = /^-- copy:start$([\s\S]*?)^-- copy:end$/m.exec(sql);
  if (!match) {
    throw new Error('migration.sql lacks the -- copy:start / -- copy:end marker lines');
  }
  return match[1].trim();
}

/** Thrown to roll the seeding transaction back so the shared database is left untouched. */
class RollBack extends Error {}

type Slot = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  energy: 'HIGH' | 'NORMAL' | 'LOW';
};

/**
 * EP15A migration round-trip (TR-E15-01, V-15-2; EP15A-AC2). Gated on
 * `DATABASE_URL`. Everything runs inside one transaction that is rolled
 * back at the end: the seeded slots, the re-run of the copy statement and
 * the assertions leave no row behind, so the spec is safe against a
 * database where the migration has already copied the real rows.
 */
describeIntegration('EP15A schedule migration — availability_slots → schedule_blocks copy', () => {
  let app: IntegrationApp;

  beforeAll(async () => {
    app = await createIntegrationApp();
  }, 120_000);

  afterAll(async () => {
    if (app) await app.app.close();
  }, 60_000);

  const SEED: Slot[] = [
    { dayOfWeek: 0, startTime: '09:00', endTime: '11:00', isAvailable: true, energy: 'HIGH' },
    { dayOfWeek: 6, startTime: '20:00', endTime: '22:30', isAvailable: true, energy: 'LOW' },
    { dayOfWeek: 3, startTime: '13:00', endTime: '14:00', isAvailable: true, energy: 'NORMAL' },
    { dayOfWeek: 0, startTime: '12:00', endTime: '13:00', isAvailable: false, energy: 'HIGH' },
    { dayOfWeek: 6, startTime: '08:00', endTime: '08:30', isAvailable: false, energy: 'NORMAL' },
    { dayOfWeek: 2, startTime: '23:00', endTime: '23:59', isAvailable: false, energy: 'LOW' },
  ];

  it('copies every slot into exactly one schedule_blocks row with matching fields and leaves availability_slots untouched', async () => {
    const runId = uuidv4();
    const statement = copyStatement();
    expect(statement).toMatch(/^INSERT INTO "schedule_blocks"/);

    let observed:
      | {
          userId: string;
          slots: Array<Record<string, unknown>>;
          blocks: Array<Record<string, unknown>>;
          slotsAfter: Array<Record<string, unknown>>;
          totalSlots: number;
          blocksBefore: number;
          blocksAfter: number;
        }
      | undefined;

    await app.prisma
      .$transaction(
        async (tx) => {
          const user = await tx.user.create({
            data: {
              email: `ep15a.${runId}@studypilot-test.invalid`,
              passwordHash: 'not-a-real-hash',
              name: 'EP15A migration',
            },
          });
          await tx.availabilitySlot.createMany({
            data: SEED.map((slot) => ({ ...slot, userId: user.id })),
          });
          const slots = await tx.availabilitySlot.findMany({
            where: { userId: user.id },
            orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
          });

          const totalSlots = await tx.availabilitySlot.count();
          const blocksBefore = await tx.scheduleBlock.count();

          await tx.$executeRawUnsafe(statement);

          const blocksAfter = await tx.scheduleBlock.count();
          const blocks = await tx.scheduleBlock.findMany({
            where: { userId: user.id },
            orderBy: [{ weekdays: 'asc' }, { startTime: 'asc' }],
          });
          const slotsAfter = await tx.availabilitySlot.findMany({
            where: { userId: user.id },
            orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
          });

          observed = {
            userId: user.id,
            slots,
            blocks,
            slotsAfter,
            totalSlots,
            blocksBefore,
            blocksAfter,
          };
          throw new RollBack('roll back the EP15A seed');
        },
        { maxWait: 15_000, timeout: 60_000 }
      )
      .catch((error: unknown) => {
        if (!(error instanceof RollBack)) throw error;
      });

    expect(observed).toBeDefined();
    const { userId, slots, blocks, slotsAfter, totalSlots, blocksBefore, blocksAfter } =
      observed as NonNullable<typeof observed>;

    // Row counts: the student's rows one-for-one, and globally one successor per slot.
    expect(slots).toHaveLength(SEED.length);
    expect(blocks).toHaveLength(SEED.length);
    expect(blocksAfter - blocksBefore).toBe(totalSlots);

    // Field-by-field: pair each slot with the block that shares its weekday bit and start time.
    for (const slot of slots) {
      const matches = blocks.filter(
        (b) => b.weekdays === 1 << (slot.dayOfWeek as number) && b.startTime === slot.startTime
      );
      expect(matches).toHaveLength(1);
      const b = matches[0];
      expect(b.userId).toBe(userId);
      expect(b.kind).toBe(slot.isAvailable ? 'STUDY' : 'BUSY');
      expect(b.energy).toBe(slot.isAvailable ? slot.energy : 'NORMAL');
      expect(b.weekdays).toBe(1 << (slot.dayOfWeek as number));
      expect(b.startTime).toBe(slot.startTime);
      expect(b.endTime).toBe(slot.endTime);
      expect(b.title).toBeNull();
      expect(b.courseId).toBeNull();
      expect(b.endDate).toBeNull();
      expect(typeof b.id).toBe('string');
      expect(b.id).toMatch(/^[0-9a-f-]{36}$/);
      // startDate = createdAt::date, in the stored (UTC) frame (D-A2).
      const createdAt = slot.createdAt as Date;
      expect((b.startDate as Date).toISOString().slice(0, 10)).toBe(
        createdAt.toISOString().slice(0, 10)
      );
      expect((b.createdAt as Date).getTime()).toBe(createdAt.getTime());
    }

    // The old table is unchanged by the copy.
    expect(JSON.stringify(slotsAfter)).toBe(JSON.stringify(slots));

    // Rolled back: nothing of the seed survives.
    expect(await app.prisma.user.findUnique({ where: { id: userId } })).toBeNull();
    expect(await app.prisma.scheduleBlock.count({ where: { userId } })).toBe(0);
  }, 90_000);
});
