import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OnboardingService } from './onboarding.service';

/**
 * SP-107A unit spec (mocked PrismaService, no database): pins the
 * onboarding state read/write semantics.
 *
 * - `getState` derives `completed` from `onboardingCompletedAt`;
 *   new/missing student returns step 1 / false / null / null.
 * - `getState` returns `semesterId: null` when the stored semester
 *   is missing or owned by another student.
 * - `update` advances the step (2 after 1), tolerates an equal re-save,
 *   rejects a regression (400), rejects out-of-range step (400).
 * - `update` with `completed: true` sets `onboardingCompletedAt`;
 *   `completed: false` → 400; empty body → 400.
 * - `update` on a completed state → 409, including the race path.
 * - `update` with a foreign/missing `semesterId` → 404.
 *
 * Mock wiring: the service claims its write with `user.updateMany`
 * (predicated on `onboardingCompletedAt: null`) and then re-reads the
 * row with `user.findUnique` — so `findUnique` is sequenced
 * (pre-state first, post-state on the re-read) and `updateMany` resolves
 * with a `{ count }` envelope.  A zero-count claim simulates the race.
 */
describe('OnboardingService (unit, mocked PrismaService)', () => {
  const findUnique = jest.fn();
  const updateMany = jest.fn();
  const findFirst = jest.fn();

  // Partial mock: OnboardingService only touches `prisma.user` and
  // `prisma.semester`.
  const prisma = {
    user: { findUnique, updateMany },
    semester: { findFirst },
  } as unknown as PrismaService;

  let service: OnboardingService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OnboardingService(prisma);
  });

  // ==================== getState ====================

  describe('getState', () => {
    it('returns step 1 / false / null / null for a missing user (safety net)', async () => {
      findUnique.mockResolvedValue(null);

      const result = await service.getState('non-existent-user');

      expect(result).toEqual({
        step: 1,
        completed: false,
        completedAt: null,
        semesterId: null,
      });
    });

    it('returns the correct shape for a new (incomplete) student', async () => {
      findUnique.mockResolvedValue({
        onboardingStep: 1,
        onboardingCompletedAt: null,
        onboardingSemesterId: null,
      });

      const result = await service.getState('user-1');

      expect(result).toEqual({
        step: 1,
        completed: false,
        completedAt: null,
        semesterId: null,
      });
    });

    it('returns completed: true when onboardingCompletedAt is set', async () => {
      const completedAt = new Date('2026-10-18T12:00:00.000Z');
      findUnique.mockResolvedValue({
        onboardingStep: 3,
        onboardingCompletedAt: completedAt,
        onboardingSemesterId: 'sem-uuid',
      });

      const result = await service.getState('user-2');

      expect(result).toEqual({
        step: 3,
        completed: true,
        completedAt: '2026-10-18T12:00:00.000Z',
        semesterId: null, // semester not found in findFirst
      });
    });

    it('returns semesterId when the stored semester exists and belongs to the student', async () => {
      findUnique.mockResolvedValue({
        onboardingStep: 2,
        onboardingCompletedAt: null,
        onboardingSemesterId: 'sem-uuid',
      });
      findFirst.mockResolvedValue({ id: 'sem-uuid' });

      const result = await service.getState('user-3');

      expect(result).toEqual({
        step: 2,
        completed: false,
        completedAt: null,
        semesterId: 'sem-uuid',
      });
    });

    it('returns semesterId: null when the stored semester is missing', async () => {
      findUnique.mockResolvedValue({
        onboardingStep: 2,
        onboardingCompletedAt: null,
        onboardingSemesterId: 'missing-uuid',
      });
      findFirst.mockResolvedValue(null);

      const result = await service.getState('user-4');

      expect(result.semesterId).toBeNull();
    });

    it('returns semesterId: null when the stored semester belongs to another student', async () => {
      findUnique.mockResolvedValue({
        onboardingStep: 2,
        onboardingCompletedAt: null,
        onboardingSemesterId: 'other-student-sem',
      });
      // findFirst with userId filter returns null (owned by another student)
      findFirst.mockResolvedValue(null);

      const result = await service.getState('user-5');

      expect(result.semesterId).toBeNull();
    });
  });

  // ==================== update ====================

  describe('update', () => {
    it('rejects an empty body (no fields provided)', async () => {
      findUnique.mockResolvedValue({
        onboardingStep: 1,
        onboardingCompletedAt: null,
        onboardingSemesterId: null,
      });

      await expect(service.update('user-1', {})).rejects.toThrow(BadRequestException);

      expect(updateMany).not.toHaveBeenCalled();
    });

    it('rejects step outside 1..3', async () => {
      findUnique.mockResolvedValue({
        onboardingStep: 1,
        onboardingCompletedAt: null,
        onboardingSemesterId: null,
      });

      await expect(service.update('user-1', { step: 4 })).rejects.toThrow(BadRequestException);
      await expect(service.update('user-1', { step: 0 })).rejects.toThrow(BadRequestException);

      expect(updateMany).not.toHaveBeenCalled();
    });

    it('rejects completed: false', async () => {
      findUnique.mockResolvedValue({
        onboardingStep: 1,
        onboardingCompletedAt: null,
        onboardingSemesterId: null,
      });

      await expect(service.update('user-1', { completed: false })).rejects.toThrow(
        BadRequestException
      );

      expect(updateMany).not.toHaveBeenCalled();
    });

    it('advances the step (1 → 2)', async () => {
      // First findUnique: the pre-write read; second: the post-claim re-read.
      findUnique
        .mockResolvedValueOnce({
          onboardingStep: 1,
          onboardingCompletedAt: null,
          onboardingSemesterId: null,
        })
        .mockResolvedValue({
          onboardingStep: 2,
          onboardingCompletedAt: null,
          onboardingSemesterId: null,
        });
      updateMany.mockResolvedValue({ count: 1 });

      const result = await service.update('user-1', { step: 2 });

      expect(result).toEqual({
        step: 2,
        completed: false,
        completedAt: null,
        semesterId: null,
      });
    });

    it('tolerates an equal re-save (step 2 → 2)', async () => {
      findUnique
        .mockResolvedValueOnce({
          onboardingStep: 2,
          onboardingCompletedAt: null,
          onboardingSemesterId: null,
        })
        .mockResolvedValue({
          onboardingStep: 2,
          onboardingCompletedAt: null,
          onboardingSemesterId: null,
        });
      updateMany.mockResolvedValue({ count: 1 });

      const result = await service.update('user-1', { step: 2 });

      expect(result.step).toBe(2);
    });

    it('rejects a step regression (current 3, requested 1)', async () => {
      findUnique.mockResolvedValue({
        onboardingStep: 3,
        onboardingCompletedAt: null,
        onboardingSemesterId: null,
      });

      await expect(service.update('user-1', { step: 1 })).rejects.toThrow(BadRequestException);

      expect(updateMany).not.toHaveBeenCalled();
    });

    it('sets onboardingCompletedAt when completed: true', async () => {
      findUnique
        .mockResolvedValueOnce({
          onboardingStep: 3,
          onboardingCompletedAt: null,
          onboardingSemesterId: null,
        })
        .mockResolvedValue({
          onboardingStep: 3,
          onboardingCompletedAt: new Date('2026-10-18T12:00:00.000Z'),
          onboardingSemesterId: null,
        });
      updateMany.mockResolvedValue({ count: 1 });

      const result = await service.update('user-1', { completed: true });

      expect(result.completed).toBe(true);
      expect(result.completedAt).toBe('2026-10-18T12:00:00.000Z');
    });

    it('rejects an already-completed state → 409', async () => {
      findUnique.mockResolvedValue({
        onboardingStep: 3,
        onboardingCompletedAt: new Date('2026-10-18T12:00:00.000Z'),
        onboardingSemesterId: 'sem-uuid',
      });

      await expect(service.update('user-1', { step: 2 })).rejects.toThrow(ConflictException);

      expect(updateMany).not.toHaveBeenCalled();
    });

    it('handles the race path: conditional update claims 0 rows, re-read shows completed → 409', async () => {
      // First findUnique: the pre-write read (not completed); second:
      // the post-claim re-read (another request completed in between).
      findUnique
        .mockResolvedValueOnce({
          onboardingStep: 1,
          onboardingCompletedAt: null,
          onboardingSemesterId: null,
        })
        .mockResolvedValue({
          onboardingStep: 3,
          onboardingCompletedAt: new Date('2026-10-18T12:00:01.000Z'),
          onboardingSemesterId: null,
        });
      // The claim matched 0 rows: the user was completed concurrently.
      updateMany.mockResolvedValue({ count: 0 });

      await expect(service.update('user-1', { step: 2 })).rejects.toThrow(ConflictException);
    });

    it('handles the race path: conditional update claims 0 rows, re-read shows step update (not completed) → returns current state', async () => {
      findUnique
        .mockResolvedValueOnce({
          onboardingStep: 1,
          onboardingCompletedAt: null,
          onboardingSemesterId: null,
        })
        .mockResolvedValue({
          onboardingStep: 3,
          onboardingCompletedAt: null,
          onboardingSemesterId: null,
        });
      // Another request advanced step to 3 without completing.
      updateMany.mockResolvedValue({ count: 0 });

      const result = await service.update('user-1', { step: 2 });

      // The other request won — we return the current state.
      expect(result.step).toBe(3);
      expect(result.completed).toBe(false);
    });

    it('validates semesterId: foreign/missing → 404, no row written', async () => {
      findUnique.mockResolvedValue({
        onboardingStep: 1,
        onboardingCompletedAt: null,
        onboardingSemesterId: null,
      });
      // The semester belongs to another student (or is missing)
      findFirst.mockResolvedValue(null);

      await expect(service.update('user-1', { semesterId: 'foreign-uuid' })).rejects.toThrow(
        NotFoundException
      );

      // The claim must not have run — no row written.
      expect(updateMany).not.toHaveBeenCalled();
    });

    it('validates semesterId: valid semester is accepted and stored', async () => {
      findUnique
        .mockResolvedValueOnce({
          onboardingStep: 1,
          onboardingCompletedAt: null,
          onboardingSemesterId: null,
        })
        .mockResolvedValue({
          onboardingStep: 1,
          onboardingCompletedAt: null,
          onboardingSemesterId: 'valid-sem',
        });
      findFirst.mockResolvedValue({ id: 'valid-sem' });
      updateMany.mockResolvedValue({ count: 1 });

      const result = await service.update('user-1', {
        semesterId: 'valid-sem',
      });

      expect(result.semesterId).toBe('valid-sem');
    });

    it('accepts semesterId: null (explicitly unset) without validation', async () => {
      findUnique
        .mockResolvedValueOnce({
          onboardingStep: 2,
          onboardingCompletedAt: null,
          onboardingSemesterId: 'old-sem',
        })
        .mockResolvedValue({
          onboardingStep: 2,
          onboardingCompletedAt: null,
          onboardingSemesterId: null,
        });
      updateMany.mockResolvedValue({ count: 1 });

      const result = await service.update('user-1', { semesterId: null });

      expect(result.semesterId).toBeNull();
    });
  });
});
