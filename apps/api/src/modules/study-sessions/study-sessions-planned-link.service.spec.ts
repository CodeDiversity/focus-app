import { ConflictException, HttpStatus, NotFoundException } from '@nestjs/common';

import {
  PlannedSessionAnchor,
  PlannedSessionStatus,
  StudySessionStatus,
} from '../../generated/prisma/client';
import { RESOURCE_NOT_FOUND } from '../../common/ownership/ownership';
import { StudySessionsService } from './study-sessions.service';

/**
 * EP13B unit spec (mocked PrismaService, no database) — the planned↔actual
 * link and the first real `PlannedSession` lifecycle transitions (TR-E13-02):
 *
 * - `startFromPlanned`: the linked ACTIVE session (assignment + planned
 *   minutes inherited), the planned row `SCHEDULED → IN_PROGRESS`, both in
 *   ONE transaction; the one-open-session 409 re-checked INSIDE it so a
 *   rejected start never leaves a planned row `IN_PROGRESS`; the
 *   today-only rule in the profile zone; the startable-status matrix; the
 *   ownership-scoped read and the uniform 404.
 * - `finish`: a linked session with ≥ 1 confirmed minute completes its
 *   planned row (conditionally, so a second linked finish is a no-op); 0
 *   confirmed minutes hands it back as `SCHEDULED`; an **unlinked** session
 *   never reaches `plannedSession` at all.
 *
 * Mock architecture: the sibling specs' partial-PrismaService pattern. The
 * transaction handle is a separate set of mocks, so "which writes happened
 * inside the transaction" is directly assertable, and a throwing callback
 * models a rollback (no mock write is applied).
 */
describe('StudySessionsService EP13B planned link (unit, mocked PrismaService)', () => {
  const userId = 'u1';
  const plannedSessionId = 'ps-1';
  const now = new Date('2026-11-14T12:00:00.000Z');

  let service: StudySessionsService;

  const studySessionFindFirst = jest.fn();
  const studySessionCreate = jest.fn();
  const studySessionUpdateMany = jest.fn();
  const plannedSessionFindFirst = jest.fn();
  const plannedSessionUpdateMany = jest.fn();
  const userFindUnique = jest.fn();

  // Transaction handle.
  const txStudySessionFindFirst = jest.fn();
  const txStudySessionCreate = jest.fn();
  const txStudySessionUpdateMany = jest.fn();
  const txPlannedSessionUpdateMany = jest.fn();
  const transaction = jest.fn();

  const tx = {
    studySession: {
      findFirst: txStudySessionFindFirst,
      create: txStudySessionCreate,
      updateMany: txStudySessionUpdateMany,
    },
    plannedSession: { updateMany: txPlannedSessionUpdateMany },
  };

  const prisma = {
    user: { findUnique: userFindUnique },
    studySession: {
      findFirst: studySessionFindFirst,
      create: studySessionCreate,
      updateMany: studySessionUpdateMany,
    },
    plannedSession: {
      findFirst: plannedSessionFindFirst,
      updateMany: plannedSessionUpdateMany,
    },
    $transaction: transaction,
  };

  /** A planned row as `startFromPlanned` selects it (today, by default). */
  const plannedRow = (overrides: Record<string, unknown> = {}) => ({
    id: plannedSessionId,
    assignmentId: 'a-1',
    durationMinutes: 50,
    status: PlannedSessionStatus.SCHEDULED,
    studyPlan: { date: new Date('2026-11-14T00:00:00.000Z') },
    ...overrides,
  });

  /** A study-session row as the service reads it back. */
  const sessionRow = (overrides: Record<string, unknown> = {}) => ({
    id: 'sess-1',
    userId,
    assignmentId: 'a-1',
    taskId: null,
    plannedSessionId: null,
    startTime: now,
    endTime: null,
    status: StudySessionStatus.ACTIVE,
    elapsedSeconds: 0,
    durationMinutes: 0,
    plannedMinutes: 50,
    notes: null,
    isFocusMode: true,
    rating: null,
    resumedAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });

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

  const expect409 = async (promise: Promise<unknown>) => {
    const error = await promise.then(
      () => {
        throw new Error('expected a 409');
      },
      (failure: unknown) => failure
    );
    expect(error).toBeInstanceOf(ConflictException);
    return error as ConflictException;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(now);

    service = new StudySessionsService(prisma as never);

    userFindUnique.mockResolvedValue({ timeZone: 'UTC' });
    plannedSessionFindFirst.mockResolvedValue(plannedRow());
    txStudySessionFindFirst.mockResolvedValue(null); // no open session
    txStudySessionCreate.mockImplementation(async (args: { data: Record<string, unknown> }) =>
      sessionRow({ ...args.data })
    );
    txStudySessionUpdateMany.mockResolvedValue({ count: 1 });
    txPlannedSessionUpdateMany.mockResolvedValue({ count: 1 });
    studySessionUpdateMany.mockResolvedValue({ count: 1 });
    transaction.mockImplementation(async (cb: (t: typeof tx) => Promise<unknown>) => cb(tx));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ===================== startFromPlanned =====================

  describe('startFromPlanned (POST /study-sessions/from-planned/:id)', () => {
    it('creates a linked ACTIVE session and moves the planned row to IN_PROGRESS in one transaction (AC-E13-03)', async () => {
      const result = await service.startFromPlanned(userId, plannedSessionId);

      expect(transaction).toHaveBeenCalledTimes(1);

      // The session inherits the planned row's assignment and duration.
      const created = txStudySessionCreate.mock.calls[0][0].data;
      expect(created).toMatchObject({
        userId,
        assignmentId: 'a-1',
        taskId: null,
        plannedSessionId,
        status: StudySessionStatus.ACTIVE,
        elapsedSeconds: 0,
        durationMinutes: 0,
        plannedMinutes: 50,
        endTime: null,
      });

      // The planned row advances — conditionally, from SCHEDULED only.
      expect(txPlannedSessionUpdateMany).toHaveBeenCalledTimes(1);
      const advance = txPlannedSessionUpdateMany.mock.calls[0][0];
      expect(advance.where).toEqual({
        id: plannedSessionId,
        studyPlan: { userId },
        status: PlannedSessionStatus.SCHEDULED,
      });
      expect(advance.data).toEqual({ status: PlannedSessionStatus.IN_PROGRESS });

      // The payload exposes the link (EP13D/EP13J consume it).
      expect(result.plannedSessionId).toBe(plannedSessionId);
      expect(result.status).toBe(StudySessionStatus.ACTIVE);
      expect(result).not.toHaveProperty('userId');
    });

    it('starting a day-anchored session fixes it at the real time (EP13G AC-3)', async () => {
      plannedSessionFindFirst.mockResolvedValue(
        plannedRow({ anchor: PlannedSessionAnchor.FLEX_DAY })
      );

      await service.startFromPlanned(userId, plannedSessionId);

      // One write, inside the same transaction: status + the fix-up.
      expect(txPlannedSessionUpdateMany).toHaveBeenCalledTimes(1);
      const advance = txPlannedSessionUpdateMany.mock.calls[0][0];
      expect(advance.data).toEqual({
        status: PlannedSessionStatus.IN_PROGRESS,
        anchor: PlannedSessionAnchor.FIXED,
        startTime: now,
        // The duration is kept; only where it sits on the clock moves.
        endTime: new Date(now.getTime() + 50 * 60_000),
      });
    });

    it('selects the anchor so the flex fix-up can be decided (EP13G)', async () => {
      await service.startFromPlanned(userId, plannedSessionId);
      expect(plannedSessionFindFirst.mock.calls[0][0].select).toMatchObject({ anchor: true });
    });

    it('a fixed session keeps its slot untouched (EP06 behaviour unchanged)', async () => {
      plannedSessionFindFirst.mockResolvedValue(plannedRow({ anchor: PlannedSessionAnchor.FIXED }));

      await service.startFromPlanned(userId, plannedSessionId);

      const advance = txPlannedSessionUpdateMany.mock.calls[0][0];
      expect(advance.data).toEqual({ status: PlannedSessionStatus.IN_PROGRESS });
      expect(advance.data).not.toHaveProperty('startTime');
      expect(advance.data).not.toHaveProperty('anchor');
    });

    it('reads the planned row scoped through its parent plan; missing or foreign → uniform 404 (AC-E13-05)', async () => {
      await service.startFromPlanned(userId, plannedSessionId);
      expect(plannedSessionFindFirst.mock.calls[0][0].where).toEqual({
        id: plannedSessionId,
        studyPlan: { userId },
      });

      // A foreign row and a missing row are indistinguishable: both are
      // filtered by the same scoped where and answer the same 404.
      jest.clearAllMocks();
      plannedSessionFindFirst.mockResolvedValue(null);
      await expect404(service.startFromPlanned(userId, plannedSessionId));
      expect(transaction).not.toHaveBeenCalled();
      expect(txPlannedSessionUpdateMany).not.toHaveBeenCalled();
    });

    it('409s when a session is already open, leaving the planned row untouched (AC-E13-03, rollback)', async () => {
      txStudySessionFindFirst.mockResolvedValue({ id: 'sess-open' });

      const error = await expect409(service.startFromPlanned(userId, plannedSessionId));
      expect(error.message).toBe('A focus session is already in progress.');

      // The guard runs INSIDE the transaction and throws before any write,
      // so nothing was created and the planned row never advanced.
      expect(txStudySessionCreate).not.toHaveBeenCalled();
      expect(txPlannedSessionUpdateMany).not.toHaveBeenCalled();
    });

    it('only today’s planned sessions can be started; the boundary is the profile zone (AC-E13-03)', async () => {
      // Yesterday — EP13C's rollover business, not a start.
      plannedSessionFindFirst.mockResolvedValue(
        plannedRow({ studyPlan: { date: new Date('2026-11-13T00:00:00.000Z') } })
      );
      const past = await expect409(service.startFromPlanned(userId, plannedSessionId));
      expect(past.message).toMatch(/earlier day/i);

      // Tomorrow — not due yet.
      plannedSessionFindFirst.mockResolvedValue(
        plannedRow({ studyPlan: { date: new Date('2026-11-15T00:00:00.000Z') } })
      );
      const future = await expect409(service.startFromPlanned(userId, plannedSessionId));
      expect(future.message).toMatch(/later day/i);

      expect(transaction).not.toHaveBeenCalled();
    });

    it('the profile zone decides which civil date is “today”', async () => {
      // 2026-11-14T12:00Z is still 2026-11-14 in New York (07:00 EST), so a
      // row dated 11-14 is startable…
      userFindUnique.mockResolvedValue({ timeZone: 'America/New_York' });
      await expect(service.startFromPlanned(userId, plannedSessionId)).resolves.toMatchObject({
        plannedSessionId,
      });

      // …while in Auckland the same instant is already 2026-11-15, so the
      // 11-14 row reads as an earlier day.
      jest.clearAllMocks();
      userFindUnique.mockResolvedValue({ timeZone: 'Pacific/Auckland' });
      plannedSessionFindFirst.mockResolvedValue(plannedRow());
      const error = await expect409(service.startFromPlanned(userId, plannedSessionId));
      expect(error.message).toMatch(/earlier day/i);
    });

    it('re-entering an IN_PROGRESS planned row is allowed and does not rewrite its status', async () => {
      plannedSessionFindFirst.mockResolvedValue(
        plannedRow({ status: PlannedSessionStatus.IN_PROGRESS })
      );

      await expect(service.startFromPlanned(userId, plannedSessionId)).resolves.toMatchObject({
        plannedSessionId,
      });

      // The conditional predicate matches no row (it is not SCHEDULED), so
      // the status write is a no-op rather than an error.
      expect(txPlannedSessionUpdateMany.mock.calls[0][0].where.status).toBe(
        PlannedSessionStatus.SCHEDULED
      );
    });

    it('finished, skipped and rolled-forward planned rows each answer 409 with their own reason', async () => {
      for (const [status, pattern] of [
        [PlannedSessionStatus.COMPLETED, /already finished/i],
        [PlannedSessionStatus.SKIPPED, /no longer part of today/i],
        [PlannedSessionStatus.RESCHEDULED, /no longer part of today/i],
      ] as const) {
        jest.clearAllMocks();
        plannedSessionFindFirst.mockResolvedValue(plannedRow({ status }));

        const error = await expect409(service.startFromPlanned(userId, plannedSessionId));
        expect(error.message).toMatch(pattern);
        expect(transaction).not.toHaveBeenCalled();
      }
    });
  });

  // ===================== finish transitions =====================

  describe('finish — the planned row follows the real session (AC-E13-03)', () => {
    const linkedActive = () =>
      sessionRow({
        plannedSessionId,
        status: StudySessionStatus.ACTIVE,
        resumedAt: new Date('2026-11-14T11:30:00.000Z'), // 30 minutes ago
      });

    it('≥ 1 confirmed minute completes the planned row, in the same transaction as the session write', async () => {
      studySessionFindFirst
        .mockResolvedValueOnce(linkedActive()) // the pre-read
        .mockResolvedValueOnce(
          sessionRow({
            plannedSessionId,
            status: StudySessionStatus.COMPLETED,
            durationMinutes: 30,
          })
        ); // the echo read

      const result = await service.finish(userId, 'sess-1', { confirmedMinutes: 30 });

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(txStudySessionUpdateMany.mock.calls[0][0].data).toMatchObject({
        status: StudySessionStatus.COMPLETED,
        durationMinutes: 30,
      });

      const complete = txPlannedSessionUpdateMany.mock.calls[0][0];
      // Conditional on the row still being open: a second linked finish
      // matches nothing and is a silent no-op (D13-3).
      expect(complete.where).toEqual({
        id: plannedSessionId,
        studyPlan: { userId },
        status: {
          in: [PlannedSessionStatus.SCHEDULED, PlannedSessionStatus.IN_PROGRESS],
        },
      });
      expect(complete.data).toEqual({ status: PlannedSessionStatus.COMPLETED });
      expect(result.durationMinutes).toBe(30);
    });

    it('0 confirmed minutes hands the planned row back as SCHEDULED', async () => {
      studySessionFindFirst.mockResolvedValueOnce(linkedActive()).mockResolvedValueOnce(
        sessionRow({
          plannedSessionId,
          status: StudySessionStatus.COMPLETED,
          durationMinutes: 0,
        })
      );

      await service.finish(userId, 'sess-1', { confirmedMinutes: 0 });

      const revert = txPlannedSessionUpdateMany.mock.calls[0][0];
      expect(revert.where).toEqual({
        id: plannedSessionId,
        studyPlan: { userId },
        status: PlannedSessionStatus.IN_PROGRESS,
      });
      expect(revert.data).toEqual({ status: PlannedSessionStatus.SCHEDULED });
    });

    it('an UNLINKED session never touches a planned row and keeps the original no-transaction path', async () => {
      studySessionFindFirst
        .mockResolvedValueOnce(sessionRow({ plannedSessionId: null }))
        .mockResolvedValueOnce(
          sessionRow({
            plannedSessionId: null,
            status: StudySessionStatus.COMPLETED,
            durationMinutes: 25,
          })
        );

      const result = await service.finish(userId, 'sess-1', { confirmedMinutes: 25 });

      expect(transaction).not.toHaveBeenCalled();
      expect(plannedSessionUpdateMany).not.toHaveBeenCalled();
      expect(txPlannedSessionUpdateMany).not.toHaveBeenCalled();
      expect(studySessionUpdateMany).toHaveBeenCalledTimes(1);
      expect(result.plannedSessionId).toBeNull();
    });

    it('a lost race inside the transaction 409s and takes the planned write back with it', async () => {
      studySessionFindFirst.mockResolvedValueOnce(linkedActive());
      txStudySessionUpdateMany.mockResolvedValue({ count: 0 });

      const error = await expect409(service.finish(userId, 'sess-1', { confirmedMinutes: 30 }));
      expect(error.message).toBe('The session changed; reload and try again.');
      // The callback threw before the planned write, so the transaction
      // rolls back with neither write applied.
      expect(txPlannedSessionUpdateMany).not.toHaveBeenCalled();
    });
  });
});
