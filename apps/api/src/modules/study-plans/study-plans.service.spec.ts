import { BadRequestException, HttpStatus, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { RESOURCE_NOT_FOUND } from '../../common/ownership/ownership';
import { STUDY_PREFERENCE_DEFAULTS } from '../../domain/study-planning/preferences';
import { StudyPlansService } from './study-plans.service';
import { UpdateStudyPreferencesDto } from './dto/update-study-preferences.dto';

/**
 * EP06A + EP06B unit spec (mocked PrismaService, no database): the
 * study-preferences service semantics for the two routes
 * (`GET /study-preferences`, `PUT /study-preferences`) and the
 * remaining-work read (`GET /study-plans/remaining-work`).
 *
 * - get: a principal-scoped read of the `User.preferences` column, the
 *   **effective** values through the defensive reader, exactly the four
 *   contract keys (never `userId`, never the rest of the bag); a missing row
 *   is the uniform 404.
 * - update: the DTO constraint set re-run for non-HTTP callers (an unknown
 *   field, a non-integer, an out-of-range value → a field-level 400 with
 *   **nothing written**); the merge onto the current *effective* values; the
 *   cross-field rules applied to the **merged** values; the write as a merge
 *   **into** `preferences.studyDefaults` (the bag's other keys survive); the
 *   scoped write (`{ id: userId }`) with 0 affected rows → the uniform 404.
 * - remaining work: the two **ownership-scoped** reads (the assignments and
 *   the `StudySession` aggregation), the civil-date conversion, the items
 *   built from the classification, the state-A unattributed total, the
 *   shared comparator's order and the uniform 404.
 */
describe('StudyPlansService (unit, mocked PrismaService)', () => {
  const userFindUnique = jest.fn();
  const userUpdateMany = jest.fn();
  const assignmentFindMany = jest.fn();
  const studySessionFindMany = jest.fn();

  // Partial mock: the service touches `prisma.user`, `prisma.assignment` and
  // `prisma.studySession`.
  const prisma = {
    user: {
      findUnique: userFindUnique,
      updateMany: userUpdateMany,
    },
    assignment: {
      findMany: assignmentFindMany,
    },
    studySession: {
      findMany: studySessionFindMany,
    },
  } as unknown as PrismaService;

  let service: StudyPlansService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new StudyPlansService(prisma);
    userUpdateMany.mockResolvedValue({ count: 1 });
  });

  const userId = 'user-1';

  /** The exact contract keys (shared API contract, EP06 README). */
  const PREFERENCE_KEYS = [
    'sessionLengthMinutes',
    'minSessionMinutes',
    'maxSessionMinutes',
    'dailyCapMinutes',
  ].sort();

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
    expect(payload.errors).toHaveProperty(field);
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

  // ==================== get (GET /study-preferences) ====================

  describe('getPreferences', () => {
    it('reads the principal’s own row and returns exactly the four effective keys', async () => {
      userFindUnique.mockResolvedValue({ preferences: null });

      const result = await service.getPreferences(userId);

      expect(userFindUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: { preferences: true },
      });
      expect(Object.keys(result).sort()).toEqual(PREFERENCE_KEYS);
      expect(result).not.toHaveProperty('userId');
      // No stored bag → the documented defaults.
      expect(result).toEqual(STUDY_PREFERENCE_DEFAULTS);
    });

    it('returns the effective values of a stored bag (the defensive reader)', async () => {
      userFindUnique.mockResolvedValue({
        preferences: {
          theme: 'dark',
          studyDefaults: {
            sessionLengthMinutes: 60,
            minSessionMinutes: 90,
            maxSessionMinutes: 120,
            dailyCapMinutes: 240,
          },
        },
      });

      const result = await service.getPreferences(userId);

      // The counterexample bag: the effective session length is 90 (the
      // clamp of step 3), not the raw 60.
      expect(result).toEqual({
        sessionLengthMinutes: 90,
        minSessionMinutes: 90,
        maxSessionMinutes: 120,
        dailyCapMinutes: 240,
      });
    });

    it('never fails on a malformed stored bag', async () => {
      userFindUnique.mockResolvedValue({ preferences: { studyDefaults: 'nonsense' } });
      await expect(service.getPreferences(userId)).resolves.toEqual(STUDY_PREFERENCE_DEFAULTS);
    });

    it('404s uniformly when the principal’s row no longer exists', async () => {
      userFindUnique.mockResolvedValue(null);
      await expect404(service.getPreferences(userId));
    });
  });

  // ==================== update (PUT /study-preferences) ====================

  describe('updatePreferences', () => {
    it('merges a partial body onto the current effective values and writes the complete object', async () => {
      userFindUnique.mockResolvedValue({
        preferences: {
          studyDefaults: {
            sessionLengthMinutes: 60,
            minSessionMinutes: 90,
            maxSessionMinutes: 120,
            dailyCapMinutes: 240,
          },
        },
      });

      const result = await service.updatePreferences(userId, { dailyCapMinutes: 300 });

      expect(userUpdateMany).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          preferences: {
            studyDefaults: {
              sessionLengthMinutes: 90,
              minSessionMinutes: 90,
              maxSessionMinutes: 120,
              dailyCapMinutes: 300,
            },
          },
        },
      });
      expect(result).toEqual({
        sessionLengthMinutes: 90,
        minSessionMinutes: 90,
        maxSessionMinutes: 120,
        dailyCapMinutes: 300,
      });
    });

    it('preserves the bag’s other keys (the write is a merge into studyDefaults)', async () => {
      userFindUnique.mockResolvedValue({
        preferences: { theme: 'dark', notifications: { email: false } },
      });

      await service.updatePreferences(userId, { sessionLengthMinutes: 45 });

      expect(userUpdateMany).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          preferences: {
            theme: 'dark',
            notifications: { email: false },
            studyDefaults: {
              sessionLengthMinutes: 45,
              minSessionMinutes: 15,
              maxSessionMinutes: 120,
              dailyCapMinutes: 240,
            },
          },
        },
      });
    });

    it('writes the complete four-key object even when the stored bag was empty', async () => {
      userFindUnique.mockResolvedValue({ preferences: null });

      await service.updatePreferences(userId, { sessionLengthMinutes: 45 });

      const written = userUpdateMany.mock.calls[0][0].data.preferences;
      expect(written.studyDefaults).toEqual({
        sessionLengthMinutes: 45,
        minSessionMinutes: 15,
        maxSessionMinutes: 120,
        dailyCapMinutes: 240,
      });
    });

    it('rejects an invalid merged value with a field-level 400 and writes nothing', async () => {
      // The effective minimum is 90, so a session length of 30 breaks the
      // cross-field rule on the merged values.
      userFindUnique.mockResolvedValue({
        preferences: {
          studyDefaults: {
            sessionLengthMinutes: 90,
            minSessionMinutes: 90,
            maxSessionMinutes: 120,
            dailyCapMinutes: 240,
          },
        },
      });

      const payload = await expect400With(
        service.updatePreferences(userId, { sessionLengthMinutes: 30 }),
        'sessionLengthMinutes'
      );
      expect((payload.errors as Record<string, string[]>).sessionLengthMinutes[0]).toContain(
        'minSessionMinutes'
      );
      expect(userUpdateMany).not.toHaveBeenCalled();
    });

    it('rejects a daily cap below the effective minimum and writes nothing', async () => {
      userFindUnique.mockResolvedValue({
        preferences: {
          studyDefaults: {
            sessionLengthMinutes: 60,
            minSessionMinutes: 60,
            maxSessionMinutes: 120,
            dailyCapMinutes: 240,
          },
        },
      });

      await expect400With(
        service.updatePreferences(userId, { dailyCapMinutes: 30 }),
        'dailyCapMinutes'
      );
      expect(userUpdateMany).not.toHaveBeenCalled();
    });

    it('rejects an unknown body field (the DTO re-validation) and writes nothing', async () => {
      userFindUnique.mockResolvedValue({ preferences: null });

      const hostile = {
        sessionLengthMinutes: 45,
        userId: 'someone-else',
      } as unknown as UpdateStudyPreferencesDto;
      await expect400With(service.updatePreferences(userId, hostile), 'userId');
      expect(userUpdateMany).not.toHaveBeenCalled();
    });

    it('rejects a non-integer and an out-of-range value and writes nothing', async () => {
      userFindUnique.mockResolvedValue({ preferences: null });

      await expect400With(
        service.updatePreferences(userId, { sessionLengthMinutes: 45.5 }),
        'sessionLengthMinutes'
      );
      await expect400With(
        service.updatePreferences(userId, { sessionLengthMinutes: 1000 }),
        'sessionLengthMinutes'
      );
      await expect400With(
        service.updatePreferences(userId, { dailyCapMinutes: 2000 }),
        'dailyCapMinutes'
      );
      expect(userUpdateMany).not.toHaveBeenCalled();
    });

    it('rejects a bag that would exceed the column’s 4096-byte cap and writes nothing', async () => {
      userFindUnique.mockResolvedValue({
        preferences: { filler: 'x'.repeat(4100) },
      });

      const payload = await expect400With(
        service.updatePreferences(userId, { sessionLengthMinutes: 45 }),
        'preferences'
      );
      expect((payload.errors as Record<string, string[]>).preferences[0]).toContain('4096');
      expect(userUpdateMany).not.toHaveBeenCalled();
    });

    it('treats an explicit null as omitted (the DTO’s @IsOptional skips nulls)', async () => {
      userFindUnique.mockResolvedValue({ preferences: null });

      const result = await service.updatePreferences(userId, { sessionLengthMinutes: null });

      expect(result.sessionLengthMinutes).toBe(60);
      expect(userUpdateMany).toHaveBeenCalledTimes(1);
    });

    it('an empty body is an empty subset: the effective values are written unchanged', async () => {
      // The contract says "any subset of the four keys" — an empty subset is
      // a legal request, and the merge is a no-op that materialises the
      // effective values in the bag.
      userFindUnique.mockResolvedValue({ preferences: null });

      const result = await service.updatePreferences(userId, {});

      expect(result).toEqual(STUDY_PREFERENCE_DEFAULTS);
      expect(userUpdateMany).toHaveBeenCalledWith({
        where: { id: userId },
        data: { preferences: { studyDefaults: STUDY_PREFERENCE_DEFAULTS } },
      });
    });

    it('404s uniformly when the principal’s row vanished before the write', async () => {
      userFindUnique.mockResolvedValue({ preferences: null });
      userUpdateMany.mockResolvedValue({ count: 0 });

      await expect404(service.updatePreferences(userId, { sessionLengthMinutes: 45 }));
    });

    it('404s uniformly when the principal’s row does not exist at all', async () => {
      userFindUnique.mockResolvedValue(null);
      await expect404(service.updatePreferences(userId, { sessionLengthMinutes: 45 }));
      expect(userUpdateMany).not.toHaveBeenCalled();
    });

    it('scopes the write to the principal’s own row', async () => {
      userFindUnique.mockResolvedValue({ preferences: null });

      await service.updatePreferences(userId, { sessionLengthMinutes: 45 });

      expect(userUpdateMany).toHaveBeenCalledTimes(1);
      expect(userUpdateMany.mock.calls[0][0].where).toEqual({ id: userId });
    });
  });

  // ============ getRemainingWork (GET /study-plans/remaining-work) ============

  describe('getRemainingWork', () => {
    /** A row as the assignment query returns it. */
    const assignmentRow = (overrides: Record<string, unknown> = {}) => ({
      id: 'assignment-1',
      title: 'Problem set 3',
      course: { code: 'CS101' },
      dueDate: new Date('2026-11-01T00:30:00.000Z'),
      estimatedHours: 3,
      status: 'PENDING',
      priority: 'MEDIUM',
      createdAt: new Date('2026-10-20T12:00:00.000Z'),
      ...overrides,
    });

    beforeEach(() => {
      // A fixed clock: "today" is the server's civil date in the profile
      // zone, and the comparator's on-time/overdue split depends on it.
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-10-30T12:00:00.000Z'));
      userFindUnique.mockResolvedValue({ timeZone: 'America/New_York' });
      assignmentFindMany.mockResolvedValue([]);
      studySessionFindMany.mockResolvedValue([]);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('scopes both reads to the authenticated student', async () => {
      await service.getRemainingWork(userId);

      expect(assignmentFindMany.mock.calls[0][0].where).toEqual({ userId });
      expect(studySessionFindMany.mock.calls[0][0].where).toEqual({ userId });
    });

    it('never selects or reads Assignment.actualHours (D07-2, AC 4)', async () => {
      assignmentFindMany.mockResolvedValue([assignmentRow({ actualHours: 7 })]);

      const result = await service.getRemainingWork(userId);

      const select = assignmentFindMany.mock.calls[0][0].select;
      expect(select).not.toHaveProperty('actualHours');
      expect(Object.keys(select)).not.toContain('actualHours');
      // The value never reaches the payload either.
      expect(JSON.stringify(result)).not.toContain('actualHours');
    });

    it('builds one item per unfinished assignment with exactly the contract keys', async () => {
      assignmentFindMany.mockResolvedValue([assignmentRow()]);

      const result = await service.getRemainingWork(userId);

      expect(Object.keys(result).sort()).toEqual(['items', 'unattributedConfirmedMinutes']);
      expect(result.items).toHaveLength(1);
      expect(Object.keys(result.items[0]).sort()).toEqual([
        'assignmentId',
        'confirmedMinutes',
        'courseCode',
        'dueDate',
        'estimatedMinutes',
        'flagged',
        'remainingMinutes',
        'status',
        'title',
      ]);
      expect(result.items[0]).toEqual({
        assignmentId: 'assignment-1',
        title: 'Problem set 3',
        courseCode: 'CS101',
        dueDate: '2026-10-31',
        estimatedMinutes: 180,
        confirmedMinutes: 0,
        remainingMinutes: 180,
        status: 'PENDING',
        flagged: null,
      });
    });

    it('never exposes userId in the payload', async () => {
      assignmentFindMany.mockResolvedValue([assignmentRow()]);

      const result = await service.getRemainingWork(userId);

      expect(JSON.stringify(result)).not.toContain(userId);
      expect(result.items[0]).not.toHaveProperty('userId');
    });

    it('converts the stored due date to the profile zone’s civil date (D06-24)', async () => {
      // 00:30 UTC on 1 November is 31 October in New York.
      assignmentFindMany.mockResolvedValue([
        assignmentRow({ dueDate: new Date('2026-11-01T00:30:00.000Z') }),
      ]);

      const result = await service.getRemainingWork(userId);

      expect(result.items[0].dueDate).toBe('2026-10-31');
    });

    it('keeps a null due date null and flags the assignment MISSING_DUE_DATE', async () => {
      assignmentFindMany.mockResolvedValue([assignmentRow({ dueDate: null })]);

      const result = await service.getRemainingWork(userId);

      expect(result.items[0].dueDate).toBeNull();
      expect(result.items[0].flagged).toBe('MISSING_DUE_DATE');
      // The estimate survives a missing due date.
      expect(result.items[0].estimatedMinutes).toBe(180);
      expect(result.items[0].remainingMinutes).toBe(180);
    });

    it('flags a missing estimate MISSING_ESTIMATE and nulls its figures', async () => {
      assignmentFindMany.mockResolvedValue([assignmentRow({ estimatedHours: null })]);

      const result = await service.getRemainingWork(userId);

      expect(result.items[0].flagged).toBe('MISSING_ESTIMATE');
      expect(result.items[0].estimatedMinutes).toBeNull();
      expect(result.items[0].remainingMinutes).toBeNull();
    });

    it('reports the confirmed minutes as unattributed and attributes none (state A, D06-7)', async () => {
      assignmentFindMany.mockResolvedValue([assignmentRow()]);
      studySessionFindMany.mockResolvedValue([
        { id: 'session-1', durationMinutes: 45 },
        { id: 'session-2', durationMinutes: 30 },
      ]);

      const result = await service.getRemainingWork(userId);

      expect(result.unattributedConfirmedMinutes).toBe(75);
      expect(result.items[0].confirmedMinutes).toBe(0);
      expect(result.items[0].remainingMinutes).toBe(180);
    });

    it('orders the items with the shared comparator: on-time, then overdue, then undated', async () => {
      assignmentFindMany.mockResolvedValue([
        assignmentRow({ id: 'undated', dueDate: null, estimatedHours: null }),
        assignmentRow({
          id: 'overdue',
          dueDate: new Date('2026-10-01T12:00:00.000Z'),
          estimatedHours: 1,
        }),
        assignmentRow({
          id: 'on-time',
          dueDate: new Date('2026-11-05T12:00:00.000Z'),
          estimatedHours: 1,
        }),
      ]);

      const result = await service.getRemainingWork(userId);

      expect(result.items.map((item) => item.assignmentId)).toEqual([
        'on-time',
        'overdue',
        'undated',
      ]);
    });

    it('404s uniformly when the principal’s row no longer exists', async () => {
      userFindUnique.mockResolvedValue(null);

      await expect404(service.getRemainingWork(userId));
      expect(assignmentFindMany).not.toHaveBeenCalled();
      expect(studySessionFindMany).not.toHaveBeenCalled();
    });
  });
});
