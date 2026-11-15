import { ConflictException, HttpStatus, NotFoundException } from '@nestjs/common';
import { StudySessionStatus } from '../../generated/prisma/client';
import { RESOURCE_NOT_FOUND } from '../../common/ownership/ownership';
import { StudySessionsService } from './study-sessions.service';

/**
 * EP13I unit spec (mocked PrismaService) — hyperfocus absorption (TR-E13-10,
 * D-I8, resolves V-13-6):
 *
 * - candidate determinism: earliest `SCHEDULED` same-assignment row on the
 *   running session's civil day (profile zone), own linked row excluded;
 * - transaction effects: candidate `SCHEDULED → COMPLETED` + the session's
 *   `plannedMinutes` grown by its duration, both conditional (race-safe);
 * - the 409 matrix (not ACTIVE, no assignment, no candidate, lost race) with
 *   actionable reasons; ownership scoping and the uniform 404.
 */
describe('StudySessionsService EP13I absorb-next (unit, mocked PrismaService)', () => {
  const userId = 'u1';
  const sessionId = 'ss-1';
  const now = new Date('2026-11-14T20:30:00.000Z');

  let service: StudySessionsService;

  const studySessionFindFirst = jest.fn();
  const plannedSessionFindFirst = jest.fn();
  const userFindUnique = jest.fn();

  const txPlannedSessionUpdateMany = jest.fn();
  const txStudySessionUpdateMany = jest.fn();
  const txStudySessionFindFirst = jest.fn();
  const transaction = jest.fn();

  const tx = {
    plannedSession: { updateMany: txPlannedSessionUpdateMany },
    studySession: { updateMany: txStudySessionUpdateMany, findFirst: txStudySessionFindFirst },
  };

  const prisma = {
    user: { findUnique: userFindUnique },
    studySession: { findFirst: studySessionFindFirst },
    plannedSession: { findFirst: plannedSessionFindFirst },
    $transaction: transaction,
  };

  const runningSession = (overrides: Record<string, unknown> = {}) => ({
    id: sessionId,
    assignmentId: 'a-1',
    plannedSessionId: 'ps-linked',
    status: StudySessionStatus.ACTIVE,
    startTime: now,
    ...overrides,
  });

  const updatedRow = (overrides: Record<string, unknown> = {}) => ({
    id: sessionId,
    userId,
    assignmentId: 'a-1',
    taskId: null,
    plannedSessionId: 'ps-linked',
    startTime: now,
    endTime: null,
    status: StudySessionStatus.ACTIVE,
    elapsedSeconds: 0,
    durationMinutes: 0,
    plannedMinutes: 85,
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
    service = new StudySessionsService(prisma as never);

    studySessionFindFirst.mockResolvedValue(runningSession());
    userFindUnique.mockResolvedValue({ timeZone: 'UTC' });
    plannedSessionFindFirst.mockResolvedValue({ id: 'ps-next', durationMinutes: 60 });
    txPlannedSessionUpdateMany.mockResolvedValue({ count: 1 });
    txStudySessionUpdateMany.mockResolvedValue({ count: 1 });
    txStudySessionFindFirst.mockResolvedValue(updatedRow());
    transaction.mockImplementation(async (cb: (t: typeof tx) => Promise<unknown>) => cb(tx));
  });

  it('absorbs the candidate in one transaction: COMPLETED + plannedMinutes grown (AC-E13-11)', async () => {
    const result = await service.absorbNext(userId, sessionId);

    expect(transaction).toHaveBeenCalledTimes(1);

    // The candidate flips conditionally — SCHEDULED only, scoped to the owner.
    const flip = txPlannedSessionUpdateMany.mock.calls[0][0];
    expect(flip.where).toEqual({ id: 'ps-next', studyPlan: { userId }, status: 'SCHEDULED' });
    expect(flip.data).toEqual({ status: 'COMPLETED' });

    // The growth is conditional on the session still running.
    const grow = txStudySessionUpdateMany.mock.calls[0][0];
    expect(grow.where).toEqual({ id: sessionId, userId, status: 'ACTIVE' });
    expect(grow.data).toEqual({ plannedMinutes: { increment: 60 } });

    // The payload is the updated session; userId never leaks.
    expect(result.plannedMinutes).toBe(85);
    expect(result).not.toHaveProperty('userId');
  });

  it('picks the deterministic candidate: earliest SCHEDULED same-assignment row today, own row excluded', async () => {
    await service.absorbNext(userId, sessionId);

    const query = plannedSessionFindFirst.mock.calls[0][0];
    expect(query.where).toEqual({
      studyPlan: { userId, date: new Date('2026-11-14T00:00:00.000Z') },
      assignmentId: 'a-1',
      status: 'SCHEDULED',
      id: { not: 'ps-linked' },
    });
    expect(query.orderBy).toEqual([{ startTime: 'asc' }, { id: 'asc' }]);
  });

  it('the civil day follows the profile zone (a 20:30Z start is already tomorrow in Auckland)', async () => {
    userFindUnique.mockResolvedValue({ timeZone: 'Pacific/Auckland' });

    await service.absorbNext(userId, sessionId);

    expect(plannedSessionFindFirst.mock.calls[0][0].where.studyPlan.date).toEqual(
      new Date('2026-11-15T00:00:00.000Z')
    );
  });

  it('an unlinked session (no plannedSessionId) still absorbs — no exclusion filter', async () => {
    studySessionFindFirst.mockResolvedValue(runningSession({ plannedSessionId: null }));

    await service.absorbNext(userId, sessionId);

    expect(plannedSessionFindFirst.mock.calls[0][0].where).not.toHaveProperty('id');
  });

  it('409 when the session is not running, with its own reason', async () => {
    for (const status of [StudySessionStatus.PAUSED, StudySessionStatus.COMPLETED]) {
      studySessionFindFirst.mockResolvedValue(runningSession({ status }));
      const error = await expect409(service.absorbNext(userId, sessionId));
      expect(error.message).toBe('This session isn’t running.');
    }
    expect(transaction).not.toHaveBeenCalled();
  });

  it('409 when the session has no assignment or no candidate exists, with the no-candidate reason', async () => {
    studySessionFindFirst.mockResolvedValue(runningSession({ assignmentId: null }));
    let error = await expect409(service.absorbNext(userId, sessionId));
    expect(error.message).toBe('No upcoming session of this assignment is planned for today.');

    studySessionFindFirst.mockResolvedValue(runningSession());
    plannedSessionFindFirst.mockResolvedValue(null);
    error = await expect409(service.absorbNext(userId, sessionId));
    expect(error.message).toBe('No upcoming session of this assignment is planned for today.');
    expect(transaction).not.toHaveBeenCalled();
  });

  it('a lost race on the candidate 409s inside the transaction — nothing half-written', async () => {
    txPlannedSessionUpdateMany.mockResolvedValue({ count: 0 });

    await expect409(service.absorbNext(userId, sessionId));
    // The growth never ran: the thrown 409 rolls the transaction back.
    expect(txStudySessionUpdateMany).not.toHaveBeenCalled();
  });

  it('a session that stopped mid-race 409s and takes the candidate flip back with it', async () => {
    txStudySessionUpdateMany.mockResolvedValue({ count: 0 });

    const error = await expect409(service.absorbNext(userId, sessionId));
    expect(error.message).toBe('This session isn’t running.');
  });

  it('missing or foreign session id → the uniform 404; the read is ownership-scoped', async () => {
    studySessionFindFirst.mockResolvedValue(null);
    await expect404(service.absorbNext(userId, sessionId));
    expect(studySessionFindFirst.mock.calls[0][0].where).toEqual({ id: sessionId, userId });
  });
});
