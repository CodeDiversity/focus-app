import { HttpStatus, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { RESOURCE_NOT_FOUND } from '../../common/ownership/ownership';
import { StudyPlansService } from './study-plans.service';

/**
 * EP13C unit spec (mocked PrismaService, no database) — rolling
 * reconciliation and the today read (TR-E13-03):
 *
 * - the rollover predicate: owned, `SCHEDULED`, civil date strictly before
 *   today (profile zone decides which date that is), not actually done (no
 *   linked COMPLETED session with ≥ 1 minute) → `RESCHEDULED`;
 * - idempotence/concurrency by construction: one conditional `updateMany`,
 *   identical on every read, no other write;
 * - history immutability: reconciliation and the today read never write
 *   `StudySession`, `Assignment`, `Task` or `User`;
 * - self-healing reads: the saved-plan read alone reconciles (AC-E13-04's
 *   "no mandatory recovery screen");
 * - `GET /study-plans/today`: the projection, the deterministic
 *   `nextSession` pick and its null reasons, and the DST-correct
 *   confirmed-minutes bounds (a 25-hour day stays one civil day).
 *
 * The queries run against mocks (which ignore `where`), so the predicate is
 * pinned by deep-equality on the issued query; the end-to-end row behavior
 * is proven in the gated `study-plans-rollover-e2e.spec.ts` (CI-executed).
 */
describe('StudyPlansService EP13C reconciliation + today (unit, mocked PrismaService)', () => {
  const userId = 'user-1';

  const userFindUnique = jest.fn();
  const userUpdateMany = jest.fn();
  const assignmentFindMany = jest.fn();
  const assignmentUpdateMany = jest.fn();
  const availabilitySlotFindMany = jest.fn();
  const courseFindMany = jest.fn();
  const studySessionFindMany = jest.fn();
  const studySessionGroupBy = jest.fn();
  const studySessionAggregate = jest.fn();
  const studySessionUpdateMany = jest.fn();
  const plannedSessionFindMany = jest.fn();
  const plannedSessionUpdateMany = jest.fn();
  const studyPlanFindFirst = jest.fn();
  const studyPlanFindMany = jest.fn();

  const prisma = {
    user: { findUnique: userFindUnique, updateMany: userUpdateMany },
    assignment: { findMany: assignmentFindMany, updateMany: assignmentUpdateMany },
    availabilitySlot: { findMany: availabilitySlotFindMany },
    course: { findMany: courseFindMany },
    studySession: {
      findMany: studySessionFindMany,
      groupBy: studySessionGroupBy,
      aggregate: studySessionAggregate,
      updateMany: studySessionUpdateMany,
    },
    plannedSession: {
      findMany: plannedSessionFindMany,
      updateMany: plannedSessionUpdateMany,
    },
    studyPlan: { findFirst: studyPlanFindFirst, findMany: studyPlanFindMany },
  } as unknown as PrismaService;

  let service: StudyPlansService;

  // Fixed clock: 2026-11-14T12:00Z. Same civil date in UTC and New York
  // (07:00 EST); already 2026-11-15 in Auckland (01:00 NZDT next day).
  const now = new Date('2026-11-14T12:00:00.000Z');

  /** One of today's planned rows, as `getToday` selects it. */
  const todayRow = (overrides: Record<string, unknown> = {}) => ({
    id: 'ps-1',
    assignmentId: 'a-1',
    startTime: new Date('2026-11-14T09:00:00.000Z'),
    endTime: new Date('2026-11-14T10:00:00.000Z'),
    durationMinutes: 60,
    status: 'SCHEDULED',
    locked: false,
    // EP13G: the today read carries the anchor and the flex-only hint.
    anchor: 'FIXED',
    windowHint: null,
    assignment: {
      id: 'a-1',
      title: 'Problem set 3',
      status: 'PENDING',
      priority: 'MEDIUM',
      createdAt: new Date('2026-10-20T12:00:00.000Z'),
      dueDate: new Date('2026-11-20T12:00:00.000Z'),
    },
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(now);

    service = new StudyPlansService(prisma);

    userFindUnique.mockResolvedValue({ timeZone: 'UTC', preferences: null });
    assignmentFindMany.mockResolvedValue([]);
    availabilitySlotFindMany.mockResolvedValue([]);
    courseFindMany.mockResolvedValue([]);
    studySessionFindMany.mockResolvedValue([]);
    studySessionGroupBy.mockResolvedValue([]);
    studySessionAggregate.mockResolvedValue({ _sum: { durationMinutes: null } });
    plannedSessionFindMany.mockResolvedValue([]);
    plannedSessionUpdateMany.mockResolvedValue({ count: 0 });
    studyPlanFindFirst.mockResolvedValue(null);
    studyPlanFindMany.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const reconcileCalls = () => plannedSessionUpdateMany.mock.calls.map((call) => call[0]);

  // ===================== the rollover =====================

  describe('reconciliation (the lazy rollover)', () => {
    it('issues exactly the contract predicate: owned, SCHEDULED, before today, not actually done → RESCHEDULED', async () => {
      await service.getToday(userId);

      expect(plannedSessionUpdateMany).toHaveBeenCalledTimes(1);
      const reconcile = reconcileCalls()[0];
      expect(reconcile).toEqual({
        where: {
          status: 'SCHEDULED',
          studyPlan: { userId, date: { lt: new Date('2026-11-14T00:00:00.000Z') } },
          // A linked COMPLETED session with ≥ 1 minute means the work
          // happened (EP13B completed the row atomically) — everything else,
          // including a deliberate 0-minute hand-back, still rolls.
          studySessions: { none: { status: 'COMPLETED', durationMinutes: { gte: 1 } } },
        },
        data: { status: 'RESCHEDULED' },
      });
    });

    it('rolls day-anchored sessions with everything else — no anchor filter (EP13G AC-3)', async () => {
      await service.getToday(userId);

      // The proof is the predicate itself: reconciliation keys off status and
      // the civil date only, so a FLEX_DAY row rolls forward through exactly
      // the same write as a FIXED one. No new code path, and none needed.
      const where = reconcileCalls()[0].where as Record<string, unknown>;
      expect(where).not.toHaveProperty('anchor');
      expect(Object.keys(where).sort()).toEqual(['status', 'studyPlan', 'studySessions']);
      expect(reconcileCalls()[0].data).toEqual({ status: 'RESCHEDULED' });
    });

    it('the profile zone decides the boundary: Auckland is already on the next civil day', async () => {
      userFindUnique.mockResolvedValue({ timeZone: 'Pacific/Auckland', preferences: null });

      await service.getToday(userId);

      // 2026-11-14T12:00Z is 2026-11-15 in Auckland, so the bound is the
      // UTC midnight of 11-15 — never a zone-converted instant.
      expect(reconcileCalls()[0].where.studyPlan.date.lt).toEqual(
        new Date('2026-11-15T00:00:00.000Z')
      );
    });

    it('is identical on every read (idempotent by construction) and runs before the rows are fetched', async () => {
      await service.getToday(userId);
      await service.getToday(userId);

      const calls = reconcileCalls();
      expect(calls).toHaveLength(2);
      expect(calls[1]).toEqual(calls[0]);

      // Ordering: the self-heal precedes the read, so the answer is always
      // the reconciled view.
      expect(plannedSessionUpdateMany.mock.invocationCallOrder[0]).toBeLessThan(
        plannedSessionFindMany.mock.invocationCallOrder[0]
      );
    });

    it('never writes StudySession, Assignment, Task or User (history immutability)', async () => {
      plannedSessionFindMany.mockResolvedValue([todayRow()]);

      await service.getToday(userId);

      expect(studySessionUpdateMany).not.toHaveBeenCalled();
      expect(assignmentUpdateMany).not.toHaveBeenCalled();
      expect(userUpdateMany).not.toHaveBeenCalled();
      // The only planned-session write is the rollover itself.
      for (const call of reconcileCalls()) {
        expect(call.data).toEqual({ status: 'RESCHEDULED' });
      }
    });

    it('the saved-plan read alone self-heals (AC-E13-04: no mandatory recovery screen)', async () => {
      await service.getPlan(userId);

      expect(plannedSessionUpdateMany).toHaveBeenCalledTimes(1);
      expect(reconcileCalls()[0].data).toEqual({ status: 'RESCHEDULED' });
    });
  });

  // ===================== the today read =====================

  describe('getToday (GET /study-plans/today)', () => {
    it('carries the anchor and the flex-only window hint (EP13G AC-5)', async () => {
      plannedSessionFindMany.mockResolvedValue([
        todayRow({ anchor: 'FLEX_DAY', windowHint: 'EVENING' }),
      ]);

      const today = await service.getToday(userId);

      expect(today.sessions[0]).toMatchObject({ anchor: 'FLEX_DAY', windowHint: 'EVENING' });
      expect(today.nextSession).toMatchObject({ anchor: 'FLEX_DAY', windowHint: 'EVENING' });
    });

    it('returns the contract shape with the reconciled sessions, zone-rendered, userId never exposed', async () => {
      plannedSessionFindMany.mockResolvedValue([
        todayRow(),
        todayRow({ id: 'ps-2', status: 'COMPLETED', locked: true }),
      ]);
      studySessionFindMany.mockResolvedValue([
        { startTime: new Date('2026-11-14T10:00:00.000Z'), durationMinutes: 45 },
      ]);

      const result = await service.getToday(userId);

      expect(Object.keys(result).sort()).toEqual([
        'confirmedMinutesToday',
        'date',
        'nextSession',
        'nextSessionReason',
        'sessions',
        'timeZone',
      ]);
      expect(result.date).toBe('2026-11-14');
      expect(result.timeZone).toBe('UTC');
      expect(result.confirmedMinutesToday).toBe(45);
      expect(result.sessions).toHaveLength(2);
      expect(result.sessions[0]).toEqual({
        id: 'ps-1',
        assignmentId: 'a-1',
        assignmentTitle: 'Problem set 3',
        date: '2026-11-14',
        startTime: '09:00',
        endTime: '10:00',
        durationMinutes: 60,
        status: 'SCHEDULED',
        locked: false,
        // EP13G: every today session carries its anchor; the hint is
        // flex-only, so a fixed session reports `null`.
        anchor: 'FIXED',
        windowHint: null,
      });
      expect(JSON.stringify(result)).not.toContain(userId);

      // The query is ownership-scoped through the parent plan and pinned to
      // today's UTC-midnight civil date.
      const query = plannedSessionFindMany.mock.calls[0][0];
      expect(query.where).toEqual({
        studyPlan: { userId, date: new Date('2026-11-14T00:00:00.000Z') },
      });
      expect(query.orderBy).toEqual([{ startTime: 'asc' }, { id: 'asc' }]);
    });

    it('nextSession skips finished/skipped/rolled sessions and finished assignments; earliest startable wins', async () => {
      plannedSessionFindMany.mockResolvedValue([
        todayRow({ id: 'ps-done', status: 'COMPLETED' }),
        todayRow({ id: 'ps-skipped', status: 'SKIPPED' }),
        todayRow({
          id: 'ps-finished-assignment',
          startTime: new Date('2026-11-14T10:00:00.000Z'),
          endTime: new Date('2026-11-14T11:00:00.000Z'),
          assignment: { ...todayRow().assignment, status: 'COMPLETED' },
        }),
        todayRow({
          id: 'ps-later',
          startTime: new Date('2026-11-14T15:00:00.000Z'),
          endTime: new Date('2026-11-14T16:00:00.000Z'),
        }),
        todayRow({
          id: 'ps-running',
          status: 'IN_PROGRESS',
          startTime: new Date('2026-11-14T13:00:00.000Z'),
          endTime: new Date('2026-11-14T14:00:00.000Z'),
        }),
      ]);

      const result = await service.getToday(userId);

      // ps-running (13:00, IN_PROGRESS) beats ps-later (15:00); the earlier
      // rows are not startable work.
      expect(result.nextSession?.id).toBe('ps-running');
      expect(result.nextSessionReason).toBeNull();
    });

    it('states the reason when there is no next session: NO_PLAN vs NOTHING_LEFT_TODAY', async () => {
      const empty = await service.getToday(userId);
      expect(empty.nextSession).toBeNull();
      expect(empty.nextSessionReason).toBe('NO_PLAN');

      plannedSessionFindMany.mockResolvedValue([todayRow({ status: 'COMPLETED' })]);
      const done = await service.getToday(userId);
      expect(done.nextSession).toBeNull();
      expect(done.nextSessionReason).toBe('NOTHING_LEFT_TODAY');
      expect(done.sessions).toHaveLength(1);
    });

    it('confirmed minutes follow the civil-date mapping — the 25-hour DST-end day keeps ALL its local hours', async () => {
      // 2026-11-01 is the US DST end. Fix the clock inside that NY day.
      jest.setSystemTime(new Date('2026-11-01T15:00:00.000Z')); // 10:00 EST
      userFindUnique.mockResolvedValue({ timeZone: 'America/New_York', preferences: null });
      studySessionFindMany.mockResolvedValue([
        // 00:30 EDT on Nov 1 — the first local hour of the DST-end day, the
        // hour a wall-clock-bound query would silently drop. Counts.
        { startTime: new Date('2026-11-01T04:30:00.000Z'), durationMinutes: 30 },
        // 01:30 EST on Nov 1 (after the fall-back). Counts.
        { startTime: new Date('2026-11-01T06:30:00.000Z'), durationMinutes: 10 },
        // 23:30 EDT on OCT 31 — the previous civil day. Excluded.
        { startTime: new Date('2026-11-01T03:30:00.000Z'), durationMinutes: 77 },
        // 00:30 EST on Nov 2 — the next civil day. Excluded.
        { startTime: new Date('2026-11-02T05:30:00.000Z'), durationMinutes: 99 },
      ]);

      const result = await service.getToday(userId);

      expect(result.date).toBe('2026-11-01');
      expect(result.confirmedMinutesToday).toBe(40);

      // The instant range is only a safe over-fetch around the civil date's
      // UTC midnight; the exact filter is the canonical civil mapping.
      const where = studySessionFindMany.mock.calls[0][0].where;
      expect(where.status).toBe('COMPLETED');
      expect(where.userId).toBe(userId);
      expect(where.startTime.gte).toEqual(new Date('2026-10-31T00:00:00.000Z'));
      expect(where.startTime.lt).toEqual(new Date('2026-11-03T00:00:00.000Z'));
    });

    it('404s uniformly when the principal’s row is gone, before any write or read', async () => {
      userFindUnique.mockResolvedValue(null);

      const error = await service.getToday(userId).then(
        () => {
          throw new Error('expected a 404');
        },
        (failure: unknown) => failure
      );
      expect(error).toBeInstanceOf(NotFoundException);
      expect((error as NotFoundException).getStatus()).toBe(HttpStatus.NOT_FOUND);
      expect((error as NotFoundException).message).toBe(RESOURCE_NOT_FOUND);
      expect(plannedSessionUpdateMany).not.toHaveBeenCalled();
      expect(plannedSessionFindMany).not.toHaveBeenCalled();
    });
  });
});
