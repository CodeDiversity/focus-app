import { BadRequestException, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

import { SaveStudyPlanDto } from './dto/save-study-plan.dto';
import { PrismaService } from '../prisma/prisma.service';
import { RESOURCE_NOT_FOUND } from '../../common/ownership/ownership';
import { StudyPlansService } from './study-plans.service';

/**
 * EP08 unit spec (mocked PrismaService, no database) — closes review finding
 * **F-01** (EP08 parent review pass 1): the API-level automated tests for
 * TR-E08-01, TR-E08-02 and TR-E08-04 that the review proved were missing.
 *
 * Pinned here (service/API boundary, executed without `DATABASE_URL`):
 * - TR-E08-01 — the missed-session classification query (civil-date `<` bound
 *   rendered as UTC midnight, `SCHEDULED` inclusion, unfinished-assignment
 *   inclusion / completed-assignment exclusion, ownership-scoped query), the
 *   uniform 404, and the empty case.
 * - TR-E08-02 — the recovery-summary aggregation: the exact `MissedSession`
 *   projection, `missedCount`, the `getRemainingWork` reuse for unfinished
 *   work and the confirmed-minutes total, the presence of the neutral
 *   non-blaming message (D08-8), the contract key set, and `userId` never
 *   appearing in the payload.
 * - TR-E08-04 — preview side-effect-free (no write call, no transaction), the
 *   missed-list correctness + `lockedPreserved`/`completedPreserved` counts,
 *   and confirm: one atomic transaction, the selective delete filter
 *   (`SCHEDULED && !locked`), the replaced-SCHEDULED-non-locked busy
 *   **exclusion** (PR-002 — an unedited resubmit never 409s), the busy set
 *   including confirmed/completed/locked, the per-session conflict reasons on
 *   the 409 re-check (locked/completed collisions surface as
 *   `OVERLAPS_CONFIRMED_SESSION` — the current contract-compliant mapping
 *   under review polish P-02, recorded here as implemented behavior), the
 *   malformed-session 400 matrix, `WINDOW_ROLLED_OVER` 409, the
 *   foreign/missing-assignment uniform 404, `targetHours` recomputed from the
 *   submitted sessions (0 for empty days), the `SCHEDULED`/`locked: false`
 *   insert, and that no `Assignment`/`StudySession`/`Task` write method is
 *   ever reached.
 * - P-05 drift pin — the `save()` twin of the same transaction is pinned in
 *   the same harness (unfiltered delete, no `locked` key on insert) so drift
 *   between the two write paths fails a test.
 *
 * Decline is client-side by contract (no server endpoint): the server-side
 * half of "decline leaves state unchanged" is exactly the preview being
 * side-effect-free, pinned here and re-proven against the real stack in
 * `study-plans-catch-up-e2e.spec.ts`.
 *
 * Mock architecture: the existing `study-plans.service.spec.ts` pattern — a
 * partial `PrismaService` of `jest.fn()`s; write-side stubs exist only so the
 * no-write assertions can name every method the service could have called.
 */
describe('StudyPlansService EP08 recovery + catch-up (unit, mocked PrismaService)', () => {
  const userId = 'user-1';

  const userFindUnique = jest.fn();
  const userUpdateMany = jest.fn();
  const assignmentFindMany = jest.fn();
  const assignmentFindUnique = jest.fn();
  const assignmentCreate = jest.fn();
  const assignmentUpdate = jest.fn();
  const assignmentUpdateMany = jest.fn();
  const availabilitySlotFindMany = jest.fn();
  const courseFindMany = jest.fn();
  const studySessionFindMany = jest.fn();
  const studySessionCreate = jest.fn();
  const studySessionUpdate = jest.fn();
  const studySessionUpdateMany = jest.fn();
  const plannedSessionFindMany = jest.fn();
  const plannedSessionUpdateMany = jest.fn();
  const plannedSessionDeleteMany = jest.fn();
  const studyPlanFindFirst = jest.fn();
  const studyPlanFindMany = jest.fn();

  // Transaction handle handed to the `$transaction` callback.
  const txStudyPlanUpsert = jest.fn();
  const txPlannedSessionDeleteMany = jest.fn();
  const txPlannedSessionCreateMany = jest.fn();
  const transaction = jest.fn();

  const tx = {
    studyPlan: { upsert: txStudyPlanUpsert },
    plannedSession: {
      deleteMany: txPlannedSessionDeleteMany,
      createMany: txPlannedSessionCreateMany,
    },
  };

  const prisma = {
    user: { findUnique: userFindUnique, updateMany: userUpdateMany },
    assignment: {
      findMany: assignmentFindMany,
      findUnique: assignmentFindUnique,
      create: assignmentCreate,
      update: assignmentUpdate,
      updateMany: assignmentUpdateMany,
    },
    availabilitySlot: { findMany: availabilitySlotFindMany },
    course: { findMany: courseFindMany },
    studySession: {
      findMany: studySessionFindMany,
      create: studySessionCreate,
      update: studySessionUpdate,
      updateMany: studySessionUpdateMany,
    },
    plannedSession: {
      findMany: plannedSessionFindMany,
      updateMany: plannedSessionUpdateMany,
      deleteMany: plannedSessionDeleteMany,
    },
    studyPlan: { findFirst: studyPlanFindFirst, findMany: studyPlanFindMany },
    $transaction: transaction,
  } as unknown as PrismaService;

  /** Every write method the service could call outside the transaction. */
  const writeMethods = [
    userUpdateMany,
    assignmentCreate,
    assignmentUpdate,
    assignmentUpdateMany,
    studySessionCreate,
    studySessionUpdate,
    studySessionUpdateMany,
    plannedSessionUpdateMany,
    plannedSessionDeleteMany,
  ];

  let service: StudyPlansService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Fixed clock: UTC "today" is 2026-10-30 (08:00 in America/New_York —
    // the same civil date in both zones, so the zone-rendered wall times are
    // deterministic too: 14:00Z is 10:00 EDT on 28–30 October 2026).
    jest.setSystemTime(new Date('2026-10-30T12:00:00.000Z'));

    service = new StudyPlansService(prisma);

    // Neutral empty-world defaults; individual tests override.
    userFindUnique.mockResolvedValue({ timeZone: 'UTC', preferences: null });
    assignmentFindMany.mockResolvedValue([]);
    assignmentFindUnique.mockResolvedValue({ userId });
    availabilitySlotFindMany.mockResolvedValue([]);
    courseFindMany.mockResolvedValue([]);
    studySessionFindMany.mockResolvedValue([]);
    plannedSessionFindMany.mockResolvedValue([]);
    studyPlanFindFirst.mockResolvedValue(null);
    studyPlanFindMany.mockResolvedValue([]);
    transaction.mockImplementation(async (cb: (t: typeof tx) => Promise<unknown>) => cb(tx));
    txStudyPlanUpsert.mockImplementation(
      async (args: { where: { userId_date: { date: Date } } }) => ({
        id: `plan-${args.where.userId_date.date.toISOString().slice(0, 10)}`,
      })
    );
    txPlannedSessionDeleteMany.mockResolvedValue({ count: 0 });
    txPlannedSessionCreateMany.mockResolvedValue({ count: 0 });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /** Assert a 400 and return its field-level `errors` map. */
  const expect400With = async (promise: Promise<unknown>, field: string) => {
    const error = await promise.then(
      () => {
        throw new Error('expected a 400');
      },
      (failure: unknown) => failure
    );
    expect(error).toBeInstanceOf(BadRequestException);
    const payload = (error as BadRequestException).getResponse() as Record<string, unknown>;
    // Array path form: the service's nested field keys contain dots
    // (`sessions.0.assignmentId`); the string form would be dot-split.
    expect(payload.errors).toHaveProperty([field]);
    return payload;
  };

  /** Assert the uniform 404. */
  const expect404 = async (promise: Promise<unknown>) => {
    const error = await promise.then(
      () => {
        throw new Error('expected a 404');
      },
      (failure: unknown) => failure
    );
    expect(error).toBeInstanceOf(NotFoundException);
    expect((error as NotFoundException).getStatus()).toBe(HttpStatus.NOT_FOUND);
    expect((error as NotFoundException).message).toBe(RESOURCE_NOT_FOUND);
    return error;
  };

  /** Assert a 409 and return its response body. */
  const expect409 = async (promise: Promise<unknown>) => {
    const error = await promise.then(
      () => {
        throw new Error('expected a 409');
      },
      (failure: unknown) => failure
    );
    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(HttpStatus.CONFLICT);
    return (error as HttpException).getResponse() as Record<string, unknown>;
  };

  /** Nothing was written — outside the transaction or inside it. */
  const expectNoWrites = () => {
    for (const write of writeMethods) {
      expect(write).not.toHaveBeenCalled();
    }
    expect(transaction).not.toHaveBeenCalled();
    expect(txStudyPlanUpsert).not.toHaveBeenCalled();
    expect(txPlannedSessionDeleteMany).not.toHaveBeenCalled();
    expect(txPlannedSessionCreateMany).not.toHaveBeenCalled();
  };

  /** A row of `assignment.findMany` as the service selects it. */
  const assignmentRow = (overrides: Record<string, unknown> = {}) => ({
    id: 'a-1',
    title: 'Problem set 3',
    course: { code: 'CS101' },
    dueDate: new Date('2099-01-01T12:00:00.000Z'),
    estimatedHours: 2,
    status: 'PENDING',
    priority: 'MEDIUM',
    createdAt: new Date('2026-10-20T12:00:00.000Z'),
    ...overrides,
  });

  /** A `plannedSession.findMany` row with the includes both reads use. */
  const plannedRow = (overrides: Record<string, unknown> = {}) => ({
    id: 'ps-1',
    assignmentId: 'a-1',
    studyPlan: { date: new Date('2026-10-28T00:00:00.000Z') },
    assignment: { id: 'a-1', title: 'Problem set 3' },
    startTime: new Date('2026-10-28T14:00:00.000Z'),
    endTime: new Date('2026-10-28T15:00:00.000Z'),
    durationMinutes: 60,
    status: 'SCHEDULED',
    locked: false,
    ...overrides,
  });

  const MISSED_SESSION_KEYS = [
    'assignmentId',
    'assignmentTitle',
    'date',
    'durationMinutes',
    'endTime',
    'id',
    'locked',
    'startTime',
  ];

  // =========================================================================
  // getRecoverySummary — TR-E08-01 (classification) + TR-E08-02 (aggregation)
  // =========================================================================

  describe('getRecoverySummary (GET /study-plans/recovery-summary)', () => {
    beforeEach(() => {
      // A non-UTC profile zone pins the boundary rule: the bound is the civil
      // date rendered as UTC midnight, NOT a zone-converted instant.
      userFindUnique.mockResolvedValue({ timeZone: 'America/New_York', preferences: null });
    });

    it('queries missed sessions with exactly the contract classification (TR-E08-01)', async () => {
      await service.getRecoverySummary(userId);

      expect(plannedSessionFindMany).toHaveBeenCalledTimes(1);
      const query = plannedSessionFindMany.mock.calls[0][0];
      // Deep-equal the whole query: ownership scoping (`studyPlan.userId`),
      // the strict civil-date bound, the SCHEDULED inclusion, the
      // unfinished-assignment filter (PENDING/IN_PROGRESS — a COMPLETED
      // assignment's sessions are never missed work, AC-E08-01), and the
      // stable order.
      expect(query.where).toEqual({
        studyPlan: { userId, date: { lt: new Date('2026-10-30T00:00:00.000Z') } },
        status: 'SCHEDULED',
        assignment: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
      });
      // The counterexample from the review: a zone-converted NY midnight
      // (04:00Z) would shift the boundary — the bound is UTC midnight of
      // the civil date string, with no conversion.
      expect(query.where.studyPlan.date.lt.getTime()).toBe(
        new Date('2026-10-30T00:00:00.000Z').getTime()
      );
      expect(query.include).toEqual({
        studyPlan: { select: { date: true } },
        assignment: { select: { id: true, title: true } },
      });
      expect(query.orderBy).toEqual([{ studyPlan: { date: 'asc' } }, { startTime: 'asc' }]);
    });

    it('404s uniformly when the principal’s row is gone, and reads nothing else (TR-E08-01)', async () => {
      userFindUnique.mockResolvedValue(null);

      await expect404(service.getRecoverySummary(userId));

      expect(plannedSessionFindMany).not.toHaveBeenCalled();
      expect(assignmentFindMany).not.toHaveBeenCalled();
      expect(studySessionFindMany).not.toHaveBeenCalled();
      expectNoWrites();
    });

    it('returns the contract shape with empty lists and missedCount 0 when nothing is missed (TR-E08-01/02)', async () => {
      const result = await service.getRecoverySummary(userId);

      expect(Object.keys(result).sort()).toEqual([
        'confirmedMinutes',
        'message',
        'missedCount',
        'missedSessions',
        'unfinishedWork',
      ]);
      expect(result.missedSessions).toEqual([]);
      expect(result.missedCount).toBe(0);
      expect(result.unfinishedWork).toEqual([]);
      expect(result.confirmedMinutes).toBe(0);
      expect(typeof result.message).toBe('string');
      expect(result.message.length).toBeGreaterThan(0);
    });

    it('projects each missed row exactly as MissedSession, zone-rendered, and counts them (TR-E08-02)', async () => {
      plannedSessionFindMany.mockResolvedValue([
        plannedRow({
          id: 'ps-locked',
          locked: true,
          startTime: new Date('2026-10-28T14:00:00.000Z'),
          endTime: new Date('2026-10-28T15:00:00.000Z'),
        }),
        plannedRow({
          id: 'ps-open',
          studyPlan: { date: new Date('2026-10-29T00:00:00.000Z') },
          startTime: new Date('2026-10-29T16:30:00.000Z'),
          endTime: new Date('2026-10-29T17:15:00.000Z'),
          durationMinutes: 45,
        }),
      ]);

      const result = await service.getRecoverySummary(userId);

      expect(result.missedCount).toBe(2);
      expect(result.missedSessions).toHaveLength(2);
      for (const row of result.missedSessions) {
        expect(Object.keys(row).sort()).toEqual(MISSED_SESSION_KEYS);
        expect(row).not.toHaveProperty('userId');
      }
      // Wall times render in the profile zone (14:00Z is 10:00 EDT); the date
      // is the plan row's stored civil date; `locked` rides along (a locked
      // past session is still reported as missed).
      expect(result.missedSessions[0]).toEqual({
        id: 'ps-locked',
        assignmentId: 'a-1',
        assignmentTitle: 'Problem set 3',
        date: '2026-10-28',
        startTime: '10:00',
        endTime: '11:00',
        durationMinutes: 60,
        locked: true,
      });
      expect(result.missedSessions[1]).toMatchObject({
        id: 'ps-open',
        date: '2026-10-29',
        startTime: '12:30',
        endTime: '13:15',
        durationMinutes: 45,
        locked: false,
      });
    });

    it('reuses getRemainingWork for unfinished work and the confirmed-minutes total (TR-E08-02)', async () => {
      assignmentFindMany.mockResolvedValue([assignmentRow()]);
      studySessionFindMany.mockResolvedValue([
        { id: 'session-1', durationMinutes: 45 },
        { id: 'session-2', durationMinutes: 30 },
      ]);

      const direct = await service.getRemainingWork(userId);
      const summary = await service.getRecoverySummary(userId);

      // Same items, same order, same total — no second implementation.
      expect(summary.unfinishedWork).toEqual(direct.items);
      expect(summary.confirmedMinutes).toBe(direct.unattributedConfirmedMinutes);
      expect(summary.confirmedMinutes).toBe(75);
      expect(summary.unfinishedWork).toHaveLength(1);
      expect(summary.unfinishedWork[0]).toMatchObject({
        assignmentId: 'a-1',
        title: 'Problem set 3',
      });
    });

    it('carries a neutral, non-blaming message (TR-E08-02 / D08-8)', async () => {
      const result = await service.getRecoverySummary(userId);

      expect(result.message.trim()).not.toBe('');
      // The same term set the shipped UI tests pin (CatchUpPreview.test.tsx
      // "copy contains no blaming terms"): the API message must pass it too
      // (PR-008).
      expect(result.message).not.toMatch(/you missed/i);
      expect(result.message).not.toMatch(/you(’'ve| have|'?ve)? failed/i);
      expect(result.message).not.toMatch(/you'(re| are) behind/i);
      expect(result.message).not.toMatch(/punitive/i);
      expect(result.message).not.toMatch(/shame/i);
    });

    it('never exposes userId anywhere in the payload (TR-E08-01 ownership scoping)', async () => {
      assignmentFindMany.mockResolvedValue([assignmentRow()]);
      plannedSessionFindMany.mockResolvedValue([plannedRow()]);

      const result = await service.getRecoverySummary(userId);

      expect(JSON.stringify(result)).not.toContain(userId);
    });
  });

  // =========================================================================
  // catchUpPreview — TR-E08-04 (side-effect-free, missed list, preserved)
  // =========================================================================

  describe('catchUpPreview (POST /study-plans/catch-up/preview)', () => {
    /**
     * The preview makes two `plannedSession.findMany` calls with different
     * filters: the missed query (carries `status: 'SCHEDULED'`) and the
     * all-planned busy read (filter `COMPLETED || locked` in code). Dispatch
     * by argument so each call sees its own result set.
     */
    const dispatchPlannedRows = (missed: unknown[], all: unknown[]) => {
      plannedSessionFindMany.mockImplementation((args: { where?: { status?: string } }) =>
        Promise.resolve(args?.where?.status === 'SCHEDULED' ? missed : all)
      );
    };

    it('is side-effect-free: no write method and no transaction is ever reached (TR-E08-04)', async () => {
      assignmentFindMany.mockResolvedValue([assignmentRow()]);
      dispatchPlannedRows([plannedRow()], [plannedRow()]);

      await service.catchUpPreview(userId);

      expectNoWrites();
      // Read-only surface: the two planned-session reads happened.
      expect(plannedSessionFindMany).toHaveBeenCalled();
    });

    it('classifies missed sessions with the same contract filters (TR-E08-01/04)', async () => {
      dispatchPlannedRows([plannedRow()], [plannedRow()]);

      await service.catchUpPreview(userId);

      const missedQuery = plannedSessionFindMany.mock.calls[0][0];
      expect(missedQuery.where).toEqual({
        studyPlan: { userId, date: { lt: new Date('2026-10-30T00:00:00.000Z') } },
        status: 'SCHEDULED',
        assignment: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
      });
    });

    it('reports the missed list and the locked/completed preservation counts (TR-E08-04)', async () => {
      const r1 = plannedRow({ id: 'ps-past-scheduled' });
      const r2 = plannedRow({ id: 'ps-past-locked', locked: true });
      const r3 = plannedRow({ id: 'ps-past-completed', status: 'COMPLETED' });
      const r4 = plannedRow({
        id: 'ps-window-locked',
        locked: true,
        studyPlan: { date: new Date('2026-11-01T00:00:00.000Z') },
        startTime: new Date('2026-11-01T14:00:00.000Z'),
        endTime: new Date('2026-11-01T15:00:00.000Z'),
      });
      const r5 = plannedRow({ id: 'ps-past-rescheduled', status: 'RESCHEDULED' });
      dispatchPlannedRows([r1, r2], [r1, r2, r3, r4, r5]);
      assignmentFindMany.mockResolvedValue([assignmentRow()]);

      const result = await service.catchUpPreview(userId);

      expect(Object.keys(result).sort()).toEqual([
        'completedPreserved',
        'days',
        'deferred',
        'from',
        'generatedAt',
        'lockedPreserved',
        'missedSessions',
        'preferences',
        'timeZone',
        'to',
        'warnings',
      ]);
      expect(result.from).toBe('2026-10-30');
      expect(result.to).toBe('2026-11-05');
      expect(result.days.map((d) => d.date)).toEqual([
        '2026-10-30',
        '2026-10-31',
        '2026-11-01',
        '2026-11-02',
        '2026-11-03',
        '2026-11-04',
        '2026-11-05',
      ]);
      // The missed list is exactly the missed query's rows (the COMPLETED and
      // RESCHEDULED rows are absent — they are not SCHEDULED, hence not missed).
      expect(result.missedSessions.map((m) => m.id)).toEqual([
        'ps-past-scheduled',
        'ps-past-locked',
      ]);
      // Counts derive from the busy classification: locked r2 + r4, completed r3.
      expect(result.lockedPreserved).toBe(2);
      expect(result.completedPreserved).toBe(1);
      for (const row of result.missedSessions) {
        expect(Object.keys(row).sort()).toEqual(MISSED_SESSION_KEYS);
      }
      expect(JSON.stringify(result)).not.toContain(userId);
    });

    it('404s uniformly when the principal’s row is gone (TR-E08-04)', async () => {
      userFindUnique.mockResolvedValue(null);

      await expect404(service.catchUpPreview(userId));

      expectNoWrites();
    });
  });

  // =========================================================================
  // catchUpConfirm — TR-E08-04
  // =========================================================================

  describe('catchUpConfirm (POST /study-plans/catch-up/confirm)', () => {
    const window = { from: '2026-10-30', to: '2026-11-05' };

    /**
     * Build the DTO exactly as the HTTP path delivers it: the global
     * `FieldValidationPipe` (main.ts) runs `plainToInstance` with
     * `enableImplicitConversion` before the service ever sees the body, so
     * nested sessions arrive as `SaveStudyPlanSessionDto` instances — not
     * plain literals. `class-validator` only descends into nested instances
     * (plain literals collapse to an `unknownValue` constraint), so a unit
     * test that handed the service raw literals would pin behavior no HTTP
     * caller can produce.
     */
    const dto = (sessions: unknown[]) =>
      plainToInstance(
        SaveStudyPlanDto,
        { ...window, sessions },
        {
          enableImplicitConversion: true,
        }
      );

    const session = (date: string, startTime: string, endTime: string, assignmentId = 'a-1') => ({
      assignmentId,
      date,
      startTime,
      endTime,
    });

    it('confirms the unedited proposal in ONE transaction: selective delete, SCHEDULED/locked:false insert, targetHours recomputed (TR-E08-04)', async () => {
      assignmentFindMany.mockResolvedValue([assignmentRow()]);

      const result = await service.catchUpConfirm(
        userId,
        dto([session('2026-10-30', '10:00', '11:00'), session('2026-10-30', '11:00', '12:00')])
      );

      // One atomic unit of work.
      expect(transaction).toHaveBeenCalledTimes(1);

      // Step 3 — delete ONLY the replaced rows: `SCHEDULED && locked: false`,
      // scoped to the principal, bounded to [from, to]. The review
      // counterexample: dropping the filter (unfiltered delete) fails here.
      expect(txPlannedSessionDeleteMany).toHaveBeenCalledTimes(1);
      const del = txPlannedSessionDeleteMany.mock.calls[0][0].where;
      expect(del).toEqual({
        status: 'SCHEDULED',
        locked: false,
        studyPlan: {
          userId,
          date: {
            gte: new Date('2026-10-30T00:00:00.000Z'),
            lte: new Date('2026-11-05T00:00:00.000Z'),
          },
        },
      });

      // Step 5 — insert the submitted sessions as SCHEDULED, locked: false.
      expect(txPlannedSessionCreateMany).toHaveBeenCalledTimes(1);
      const inserted = txPlannedSessionCreateMany.mock.calls[0][0].data;
      expect(inserted).toHaveLength(2);
      for (const row of inserted) {
        expect(row).toMatchObject({
          studyPlanId: 'plan-2026-10-30',
          assignmentId: 'a-1',
          durationMinutes: 60,
          status: 'SCHEDULED',
          locked: false,
        });
      }
      expect(inserted[0].startTime).toEqual(new Date('2026-10-30T10:00:00.000Z'));
      expect(inserted[0].endTime).toEqual(new Date('2026-10-30T11:00:00.000Z'));

      // Step 4 — targetHours recomputed from the SUBMITTED sessions (PR-007):
      // 120 placed minutes on day 0 → 2; every other day of the window → 0.
      expect(txStudyPlanUpsert).toHaveBeenCalledTimes(7);
      const targetByDate = new Map(
        txStudyPlanUpsert.mock.calls.map((call) => [
          (call[0] as { where: { userId_date: { date: Date } } }).where.userId_date.date
            .toISOString()
            .slice(0, 10),
          (call[0] as { update: { targetHours: number } }).update.targetHours,
        ])
      );
      expect(targetByDate.get('2026-10-30')).toBe(2);
      for (const date of [
        '2026-10-31',
        '2026-11-01',
        '2026-11-02',
        '2026-11-03',
        '2026-11-04',
        '2026-11-05',
      ]) {
        expect(targetByDate.get(date)).toBe(0);
      }

      // Step 6 — nothing else was written anywhere: no Assignment, StudySession
      // or Task write method was reached (AC-E08-03/08 at the service seam).
      expect(assignmentCreate).not.toHaveBeenCalled();
      expect(assignmentUpdate).not.toHaveBeenCalled();
      expect(assignmentUpdateMany).not.toHaveBeenCalled();
      expect(studySessionCreate).not.toHaveBeenCalled();
      expect(studySessionUpdate).not.toHaveBeenCalled();
      expect(studySessionUpdateMany).not.toHaveBeenCalled();
      expect(userUpdateMany).not.toHaveBeenCalled();
      expect(plannedSessionUpdateMany).not.toHaveBeenCalled();
      expect(plannedSessionDeleteMany).not.toHaveBeenCalled();

      // The response is the saved plan for the confirmed window.
      expect(result.from).toBe(window.from);
      expect(result.to).toBe(window.to);
    });

    it('excludes the replaced SCHEDULED non-locked sessions from the busy set — an unedited resubmit never 409s (TR-E08-04, PR-002)', async () => {
      // The exact rows confirm is about to delete: same day, same slot, as
      // the resubmitted proposal. Including them in the busy set would make
      // every unedited confirm return 409 (PR-002 counterexample).
      plannedSessionFindMany.mockResolvedValue([
        plannedRow({
          id: 'ps-replaced',
          studyPlan: { date: new Date('2026-10-31T00:00:00.000Z') },
          startTime: new Date('2026-10-31T14:00:00.000Z'),
          endTime: new Date('2026-10-31T15:00:00.000Z'),
        }),
      ]);
      assignmentFindMany.mockResolvedValue([assignmentRow()]);

      await expect(
        service.catchUpConfirm(userId, dto([session('2026-10-31', '14:00', '15:00')]))
      ).resolves.toMatchObject({ from: window.from, to: window.to });

      expect(transaction).toHaveBeenCalledTimes(1);
    });

    it('re-checks conflicts on confirm: locked and completed planned collisions 409 with per-session OVERLAPS_CONFIRMED_SESSION reasons (TR-E08-04; P-02 current mapping pinned as implemented)', async () => {
      // Busy set step 2: completed + locked PlannedSessions enter the busy
      // set; replaced SCHEDULED non-locked rows do not (previous test).
      plannedSessionFindMany.mockResolvedValue([
        plannedRow({
          id: 'ps-locked',
          locked: true,
          studyPlan: { date: new Date('2026-10-31T00:00:00.000Z') },
          startTime: new Date('2026-10-31T14:00:00.000Z'),
          endTime: new Date('2026-10-31T15:00:00.000Z'),
        }),
        plannedRow({
          id: 'ps-completed',
          status: 'COMPLETED',
          studyPlan: { date: new Date('2026-11-01T00:00:00.000Z') },
          startTime: new Date('2026-11-01T14:00:00.000Z'),
          endTime: new Date('2026-11-01T15:00:00.000Z'),
        }),
      ]);
      assignmentFindMany.mockResolvedValue([assignmentRow()]);

      const body = await expect409(
        service.catchUpConfirm(
          userId,
          dto([session('2026-10-31', '14:30', '15:30'), session('2026-11-01', '14:30', '15:30')])
        )
      );
      expect(body.statusCode).toBe(409);
      expect(body.error).toBe('Conflict');
      // Per-session entries, keyed by submitted index (EP08E client shape).
      expect(body.conflicts).toEqual([
        {
          sessionIndex: 0,
          date: '2026-10-31',
          startTime: '14:30',
          reason: 'OVERLAPS_CONFIRMED_SESSION',
        },
        {
          sessionIndex: 1,
          date: '2026-11-01',
          startTime: '14:30',
          reason: 'OVERLAPS_CONFIRMED_SESSION',
        },
      ]);
      // 409 means nothing was written.
      expectNoWrites();
    });

    it('re-checks confirmed StudySession collisions too: 409 OVERLAPS_CONFIRMED_SESSION (TR-E08-04)', async () => {
      studySessionFindMany.mockResolvedValue([
        {
          id: 'session-1',
          startTime: new Date('2026-10-31T14:00:00.000Z'),
          endTime: new Date('2026-10-31T15:00:00.000Z'),
          durationMinutes: 60,
        },
      ]);
      assignmentFindMany.mockResolvedValue([assignmentRow()]);

      const body = await expect409(
        service.catchUpConfirm(userId, dto([session('2026-10-31', '14:30', '15:30')]))
      );
      expect(body.conflicts).toHaveLength(1);
      expect((body.conflicts as Array<{ reason: string }>)[0]).toMatchObject({
        sessionIndex: 0,
        reason: 'OVERLAPS_CONFIRMED_SESSION',
      });
      expectNoWrites();
    });

    it('attributes the other conflict reasons by the shared precedence: class, blocked window, submitted-vs-submitted (TR-E08-04)', async () => {
      assignmentFindMany.mockResolvedValue([assignmentRow()]);

      // OVERLAPS_CLASS — a class meeting on 2026-10-31's weekday.
      const dow31 = new Date('2026-10-31T00:00:00.000Z').getUTCDay();
      courseFindMany.mockResolvedValue([
        {
          id: 'course-1',
          meetings: [{ dayOfWeek: dow31, startTime: '09:00', endTime: '10:30' }],
        },
      ]);
      const classBody = await expect409(
        service.catchUpConfirm(userId, dto([session('2026-10-31', '09:30', '10:30')]))
      );
      expect((classBody.conflicts as Array<{ reason: string }>)[0].reason).toBe('OVERLAPS_CLASS');
      courseFindMany.mockResolvedValue([]);

      // OVERLAPS_BLOCKED_TIME — an unavailable slot on 2026-11-02's weekday.
      const dow02 = new Date('2026-11-02T00:00:00.000Z').getUTCDay();
      availabilitySlotFindMany.mockResolvedValue([
        { dayOfWeek: dow02, startTime: '13:00', endTime: '14:00', isAvailable: false },
      ]);
      const blockedBody = await expect409(
        service.catchUpConfirm(userId, dto([session('2026-11-02', '13:30', '14:30')]))
      );
      expect((blockedBody.conflicts as Array<{ reason: string }>)[0].reason).toBe(
        'OVERLAPS_BLOCKED_TIME'
      );
      availabilitySlotFindMany.mockResolvedValue([]);

      // OVERLAPS_PLANNED_SESSION — two submitted sessions on the same slot.
      const submittedBody = await expect409(
        service.catchUpConfirm(
          userId,
          dto([session('2026-11-03', '09:00', '10:00'), session('2026-11-03', '09:30', '10:30')])
        )
      );
      const conflicts = submittedBody.conflicts as Array<{ sessionIndex: number; reason: string }>;
      expect(conflicts).toHaveLength(2);
      expect(conflicts.map((c) => c.reason)).toEqual([
        'OVERLAPS_PLANNED_SESSION',
        'OVERLAPS_PLANNED_SESSION',
      ]);
      expectNoWrites();
    });

    it('rejects the malformed-session matrix with field-level 400s and writes nothing (TR-E08-04 / DoD 2)', async () => {
      // Blank assignmentId.
      await expect400With(
        service.catchUpConfirm(userId, dto([session('2026-10-30', '10:00', '11:00', '   ')])),
        'sessions.0.assignmentId'
      );
      // Date outside the named window.
      await expect400With(
        service.catchUpConfirm(userId, dto([session('2026-11-10', '10:00', '11:00')])),
        'sessions.0.date'
      );
      // endTime equal to startTime (and the after-case is the same rule).
      await expect400With(
        service.catchUpConfirm(userId, dto([session('2026-10-30', '10:00', '10:00')])),
        'sessions.0.endTime'
      );
      // The window itself must be exactly seven days (valid sessions, so the
      // only violation left is the window length).
      const payload = await expect400With(
        service.catchUpConfirm(
          userId,
          plainToInstance(
            SaveStudyPlanDto,
            { ...window, to: '2026-11-04', sessions: [session('2026-10-30', '10:00', '11:00')] },
            { enableImplicitConversion: true }
          )
        ),
        'to'
      );
      expect((payload.errors as Record<string, string[]>).to[0]).toContain('six days after from');

      expectNoWrites();
    });

    it('409s WINDOW_ROLLED_OVER when the window left the tolerance, and writes nothing (TR-E08-04)', async () => {
      for (const stale of [
        { from: '2026-10-23', to: '2026-10-29' }, // today − 7: rolled over
        { from: '2026-10-31', to: '2026-11-06' }, // future from: not this week
      ]) {
        const error = await service
          .catchUpConfirm(userId, { ...stale, sessions: [] } as Parameters<
            StudyPlansService['catchUpConfirm']
          >[1])
          .then(
            () => {
              throw new Error(`expected a 409 for ${stale.from}`);
            },
            (failure: unknown) => failure
          );
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(HttpStatus.CONFLICT);
        expect((error as HttpException).getResponse()).toMatchObject({
          error: 'WINDOW_ROLLED_OVER',
        });
      }
      // The tolerance edge today − 6 IS accepted.
      assignmentFindMany.mockResolvedValue([assignmentRow()]);
      await expect(
        service.catchUpConfirm(userId, {
          from: '2026-10-24',
          to: '2026-10-30',
          sessions: [],
        } as Parameters<StudyPlansService['catchUpConfirm']>[1])
      ).resolves.toMatchObject({ from: '2026-10-24', to: '2026-10-30' });
    });

    it('foreign or missing assignment ids return the uniform 404 and write nothing (TR-E08-04)', async () => {
      assignmentFindMany.mockResolvedValue([assignmentRow()]);
      assignmentFindUnique.mockImplementation((args: { where: { id: string } }) =>
        args.where.id === 'a-foreign'
          ? Promise.resolve({ userId: 'student-B' })
          : Promise.resolve(null)
      );

      // Owned by another student → the uniform 404 (not 403, not distinct).
      await expect404(
        service.catchUpConfirm(userId, dto([session('2026-10-30', '10:00', '11:00', 'a-foreign')]))
      );
      // Same answer for a row that does not exist at all — no existence oracle.
      await expect404(
        service.catchUpConfirm(userId, dto([session('2026-10-30', '10:00', '11:00', 'a-gone')]))
      );

      expect(assignmentFindUnique).toHaveBeenCalledWith({
        where: { id: 'a-foreign' },
        select: { userId: true },
      });
      expectNoWrites();
    });
  });

  // =========================================================================
  // P-05 drift pin — the save() twin of the same transaction
  // =========================================================================

  describe('save (EP06D) — the twin write path pinned against confirm drift (P-05)', () => {
    it('save() deletes WITHOUT the SCHEDULED/locked filter and inserts WITHOUT a locked key — the two paths differ only where the contract says they must', async () => {
      userFindUnique.mockResolvedValue({ timeZone: 'UTC', preferences: null });
      assignmentFindMany.mockResolvedValue([assignmentRow()]);

      await service.save(
        userId,
        plainToInstance(
          SaveStudyPlanDto,
          {
            from: '2026-10-30',
            to: '2026-11-05',
            sessions: [
              {
                assignmentId: 'a-1',
                date: '2026-10-30',
                startTime: '10:00',
                endTime: '11:00',
              },
            ],
          },
          { enableImplicitConversion: true }
        )
      );

      expect(transaction).toHaveBeenCalledTimes(1);
      const del = txPlannedSessionDeleteMany.mock.calls[0][0].where;
      // EP06 save replaces EVERY row of the window — no status/locked filter.
      expect(del).toEqual({
        studyPlan: {
          userId,
          date: {
            gte: new Date('2026-10-30T00:00:00.000Z'),
            lte: new Date('2026-11-05T00:00:00.000Z'),
          },
        },
      });
      expect(del).not.toHaveProperty('status');
      expect(del).not.toHaveProperty('locked');

      const inserted = txPlannedSessionCreateMany.mock.calls[0][0].data;
      expect(inserted[0].status).toBe('SCHEDULED');
      // EP06 save never touches the lock flag (EP08 confirm pins
      // `locked: false` — that asymmetry is the contract; both pins fail if
      // either path drifts toward the other).
      expect(inserted[0]).not.toHaveProperty('locked');
    });
  });
});
