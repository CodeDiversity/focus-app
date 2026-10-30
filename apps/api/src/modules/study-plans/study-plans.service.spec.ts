import { BadRequestException, HttpStatus, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { RESOURCE_NOT_FOUND } from '../../common/ownership/ownership';
import { STUDY_PREFERENCE_DEFAULTS } from '../../domain/study-planning/preferences';
import { StudyPlansService } from './study-plans.service';
import { UpdateStudyPreferencesDto } from './dto/update-study-preferences.dto';

/**
 * EP06A unit spec (mocked PrismaService, no database): the study-preferences
 * service semantics for the two routes (`GET /study-preferences`,
 * `PUT /study-preferences`).
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
 */
describe('StudyPlansService (unit, mocked PrismaService)', () => {
  const userFindUnique = jest.fn();
  const userUpdateMany = jest.fn();

  // Partial mock: the service only touches `prisma.user`.
  const prisma = {
    user: {
      findUnique: userFindUnique,
      updateMany: userUpdateMany,
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
});
