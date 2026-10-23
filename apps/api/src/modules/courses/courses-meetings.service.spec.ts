import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RESOURCE_NOT_FOUND } from '../../common/ownership/ownership';
import { CoursesMeetingsService, toMeetingResponse } from './courses-meetings.service';

/**
 * SP-112A unit spec (mocked PrismaService, no database): pins the
 * class-meeting service semantics for the four nested routes
 * (`GET/POST /courses/:id/meetings`, `PATCH/DELETE /courses/:id/meetings/:meetingId`).
 *
 * - list: course-ownership gate first (uniform 404 on a miss), then a
 *   `courseId` + principal `userId` scoped `findMany`, ordered `dayOfWeek`
 *   asc / `startTime` asc, projected to the 6-key `ClassMeeting` shape.
 * - create: the course gate; field-level 400s (dayOfWeek 0–6, `HH:mm`
 *   format + hour/minute bounds, `endTime` strictly after `startTime` —
 *   no midnight wrap); P2002 on the per-course slot → specific 409.
 * - update (PATCH): dual-ownership `findFirst({ id, courseId, userId })`
 *   miss → uniform 404 with no write; at-least-one-field; merged-value
 *   validation (a patch of one field is only legal against the stored row);
 *   partial write of only the provided fields; P2002 → 409; P2025 → 404.
 * - delete: scoped `deleteMany({ id, courseId, userId })`; 0 affected →
 *   uniform 404 via `assertAffected`.
 *
 * The `GET /courses/:id` detail projection (the `toMeetingResponse` reuse)
 * is pinned in `courses.service.spec.ts`.
 */
describe('CoursesMeetingsService (unit, mocked PrismaService)', () => {
  const courseFindFirst = jest.fn();
  const meetingFindFirst = jest.fn();
  const meetingFindMany = jest.fn();
  const meetingCreate = jest.fn();
  const meetingUpdate = jest.fn();
  const meetingDeleteMany = jest.fn();

  // Partial mock: the service only touches `prisma.course` and
  // `prisma.classMeeting`.
  const prisma = {
    course: { findFirst: courseFindFirst },
    classMeeting: {
      findFirst: meetingFindFirst,
      findMany: meetingFindMany,
      create: meetingCreate,
      update: meetingUpdate,
      deleteMany: meetingDeleteMany,
    },
  } as unknown as PrismaService;

  let service: CoursesMeetingsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CoursesMeetingsService(prisma);
  });

  const courseId = 'course-1';
  const meetingId = 'meeting-1';
  const userId = 'user-1';

  const meetingRow = {
    id: meetingId,
    userId,
    courseId,
    dayOfWeek: 1, // Monday
    startTime: '09:00',
    endTime: '10:30',
    createdAt: new Date('2026-10-18T12:00:00.000Z'),
    updatedAt: new Date('2026-10-18T12:00:00.000Z'),
  };

  /** The exact `ClassMeeting` contract keys (shared API contract). */
  const MEETING_KEYS = ['createdAt', 'dayOfWeek', 'endTime', 'id', 'startTime', 'updatedAt'].sort();

  const validDto = { dayOfWeek: 1, startTime: '09:00', endTime: '10:30' };

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

  // ==================== list (GET /courses/:id/meetings) ====================

  describe('list', () => {
    it('gates on course ownership, then scopes the query to course + principal, ordered dayOfWeek/startTime', async () => {
      courseFindFirst.mockResolvedValue({ id: courseId });
      meetingFindMany.mockResolvedValue([
        { ...meetingRow, id: 'm-1', dayOfWeek: 3, startTime: '14:00', endTime: '15:30' },
        { ...meetingRow, id: 'm-2' },
      ]);

      const result = await service.list(userId, courseId);

      // The course gate: the principal is in the where.
      expect(courseFindFirst).toHaveBeenCalledWith({
        where: { id: courseId, userId },
        select: { id: true },
      });
      // The meeting query carries both `courseId` and the principal's
      // `userId` (repo ownership convention) and the contract ordering.
      expect(meetingFindMany).toHaveBeenCalledWith({
        where: { courseId, userId },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      });
      expect(result).toHaveLength(2);
      for (const meeting of result) {
        expect(Object.keys(meeting).sort()).toEqual(MEETING_KEYS);
      }
      // `userId`/`courseId` are never exposed (the course is the navigation
      // unit — D112-2); timestamps are ISO strings.
      expect(result[0]).toEqual({
        id: 'm-1',
        dayOfWeek: 3,
        startTime: '14:00',
        endTime: '15:30',
        createdAt: '2026-10-18T12:00:00.000Z',
        updatedAt: '2026-10-18T12:00:00.000Z',
      });
    });

    it('an empty course → an empty array (no meetings yet)', async () => {
      courseFindFirst.mockResolvedValue({ id: courseId });
      meetingFindMany.mockResolvedValue([]);

      const result = await service.list(userId, courseId);

      expect(result).toEqual([]);
    });

    it("a missing or another student's course id → uniform 404, no meeting query", async () => {
      courseFindFirst.mockResolvedValue(null);

      await expect404(service.list(userId, 'someone-elses-course'));

      expect(meetingFindMany).not.toHaveBeenCalled();
    });
  });

  // ==================== create (POST /courses/:id/meetings) ====================

  describe('create', () => {
    it('creates the meeting with the principal userId + the route courseId and returns the 6-key shape', async () => {
      courseFindFirst.mockResolvedValue({ id: courseId });
      meetingCreate.mockResolvedValue(meetingRow);

      const result = await service.create(userId, courseId, validDto);

      expect(courseFindFirst).toHaveBeenCalledWith({
        where: { id: courseId, userId },
        select: { id: true },
      });
      expect(meetingCreate).toHaveBeenCalledWith({
        data: {
          userId,
          courseId,
          dayOfWeek: 1,
          startTime: '09:00',
          endTime: '10:30',
        },
      });
      expect(Object.keys(result).sort()).toEqual(MEETING_KEYS);
      expect(result).toEqual({
        id: meetingId,
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '10:30',
        createdAt: '2026-10-18T12:00:00.000Z',
        updatedAt: '2026-10-18T12:00:00.000Z',
      });
    });

    it.each([
      ['a weekday of -1', { dayOfWeek: -1, startTime: '09:00', endTime: '10:30' }, 'dayOfWeek'],
      ['a weekday of 7', { dayOfWeek: 7, startTime: '09:00', endTime: '10:30' }, 'dayOfWeek'],
      [
        'a non-integer weekday (1.5)',
        { dayOfWeek: 1.5, startTime: '09:00', endTime: '10:30' },
        'dayOfWeek',
      ],
      [
        'a non-numeric weekday',
        { dayOfWeek: '1', startTime: '09:00', endTime: '10:30' },
        'dayOfWeek',
      ],
      [
        'an un-padded hour (9:00)',
        { dayOfWeek: 1, startTime: '9:00', endTime: '10:30' },
        'startTime',
      ],
      ['a 25:00 hour', { dayOfWeek: 1, startTime: '25:00', endTime: '26:00' }, 'startTime'],
      ['a 12:60 minute', { dayOfWeek: 1, startTime: '12:60', endTime: '13:60' }, 'startTime'],
      [
        'an end equal to the start',
        { dayOfWeek: 1, startTime: '09:00', endTime: '09:00' },
        'endTime',
      ],
      [
        'an end before the start',
        { dayOfWeek: 1, startTime: '10:30', endTime: '09:00' },
        'endTime',
      ],
      [
        'a midnight wrap (23:00 → 01:00)',
        { dayOfWeek: 1, startTime: '23:00', endTime: '01:00' },
        'endTime',
      ],
      ['a non-string time', { dayOfWeek: 1, startTime: 900, endTime: '10:30' }, 'startTime'],
    ])('a %s → 400 with %s in errors, no write', async (_label, dto, field) => {
      courseFindFirst.mockResolvedValue({ id: courseId });

      const payload = await expect400With(
        service.create(
          userId,
          courseId,
          dto as { dayOfWeek: number; startTime: string; endTime: string }
        ),
        field
      );
      expect(Array.isArray(payload.message)).toBe(true);
      expect(meetingCreate).not.toHaveBeenCalled();
    });

    it('accepts boundary values (Sunday 0, Saturday 6, 00:00 start, 23:59 end)', async () => {
      courseFindFirst.mockResolvedValue({ id: courseId });
      meetingCreate.mockResolvedValue(meetingRow);

      await service.create(userId, courseId, {
        dayOfWeek: 0,
        startTime: '00:00',
        endTime: '00:01',
      });
      expect(meetingCreate).toHaveBeenCalledTimes(1);

      jest.clearAllMocks();
      courseFindFirst.mockResolvedValue({ id: courseId });
      meetingCreate.mockResolvedValue(meetingRow);

      await service.create(userId, courseId, {
        dayOfWeek: 6,
        startTime: '23:58',
        endTime: '23:59',
      });
      expect(meetingCreate).toHaveBeenCalledTimes(1);
    });

    it("a missing or another student's course id → uniform 404, no write", async () => {
      courseFindFirst.mockResolvedValue(null);

      await expect404(service.create(userId, 'someone-elses-course', validDto));

      expect(meetingCreate).not.toHaveBeenCalled();
    });

    it('a taken slot for the course (P2002) → 409 with the specific message', async () => {
      courseFindFirst.mockResolvedValue({ id: courseId });
      meetingCreate.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '7.10.0',
        })
      );

      const error = await service.create(userId, courseId, validDto).then(
        () => {
          throw new Error('expected a 409');
        },
        (failure: unknown) => failure
      );

      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getStatus()).toBe(HttpStatus.CONFLICT);
      expect((error as ConflictException).message).toBe('A meeting already exists at this time.');
    });

    it('rethrows unrelated errors (the global filter remains the fallback)', async () => {
      courseFindFirst.mockResolvedValue({ id: courseId });
      const unexpected = new Error('boom');
      meetingCreate.mockRejectedValue(unexpected);

      await expect(service.create(userId, courseId, validDto)).rejects.toBe(unexpected);
    });
  });

  // ==================== update (PATCH /courses/:id/meetings/:meetingId) ====================

  describe('update (partial merge)', () => {
    const expectNoWrite = () => {
      expect(meetingUpdate).not.toHaveBeenCalled();
    };

    it("a dual-ownership miss (missing / another student's / different course) → uniform 404, no write", async () => {
      // Every miss shape resolves to `null` from the dual-ownership lookup;
      // the real-database distinction between the shapes is pinned in
      // `courses-meetings-data-scoping.spec.ts`.
      meetingFindFirst.mockResolvedValue(null);

      await expect404(service.update(userId, courseId, meetingId, { dayOfWeek: 2 }));

      // The dual-ownership lookup carries both `courseId` and `userId`.
      expect(meetingFindFirst).toHaveBeenCalledWith({
        where: { id: meetingId, courseId, userId },
      });
      expectNoWrite();
    });

    it('an empty body → 400 "At least one field must be provided"', async () => {
      meetingFindFirst.mockResolvedValue(meetingRow);

      const error = await service.update(userId, courseId, meetingId, {}).then(
        () => {
          throw new Error('expected a 400');
        },
        (failure: unknown) => failure
      );

      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).message).toBe('At least one field must be provided');
      expectNoWrite();
    });

    it('an explicit-null-only body → 400 (nulls are omitted, so nothing to merge)', async () => {
      meetingFindFirst.mockResolvedValue(meetingRow);

      const error = await service
        .update(userId, courseId, meetingId, { dayOfWeek: null, startTime: null, endTime: null })
        .then(
          () => {
            throw new Error('expected a 400');
          },
          (failure: unknown) => failure
        );

      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).message).toBe('At least one field must be provided');
      expectNoWrite();
    });

    it('writes only the provided field (partial merge) and returns the updated shape', async () => {
      meetingFindFirst.mockResolvedValue(meetingRow);
      meetingUpdate.mockResolvedValue({ ...meetingRow, dayOfWeek: 3 });

      const result = await service.update(userId, courseId, meetingId, { dayOfWeek: 3 });

      expect(meetingUpdate).toHaveBeenCalledWith({
        where: { id: meetingId, userId },
        data: { dayOfWeek: 3 },
      });
      expect(Object.keys(result).sort()).toEqual(MEETING_KEYS);
      expect(result).toMatchObject({
        id: meetingId,
        dayOfWeek: 3,
        startTime: '09:00',
        endTime: '10:30',
      });
    });

    it('writes several provided fields at once', async () => {
      meetingFindFirst.mockResolvedValue(meetingRow);
      meetingUpdate.mockResolvedValue(meetingRow);

      await service.update(userId, courseId, meetingId, {
        dayOfWeek: 3,
        startTime: '14:00',
        endTime: '15:30',
      });

      expect(meetingUpdate).toHaveBeenCalledWith({
        where: { id: meetingId, userId },
        data: { dayOfWeek: 3, startTime: '14:00', endTime: '15:30' },
      });
    });

    // Merged-value validation (the service re-checks the post-patch values).

    it('an endTime patched to equal the stored startTime → 400 errors.endTime, no write', async () => {
      meetingFindFirst.mockResolvedValue(meetingRow);

      const payload = await expect400With(
        service.update(userId, courseId, meetingId, { endTime: '09:00' }),
        'endTime'
      );
      expect(payload.errors).toHaveProperty('endTime');
      expectNoWrite();
    });

    it('a startTime patched after the stored endTime → 400 errors.endTime, no write', async () => {
      meetingFindFirst.mockResolvedValue(meetingRow);

      await expect400With(
        service.update(userId, courseId, meetingId, { startTime: '11:00' }),
        'endTime'
      );
      expectNoWrite();
    });

    it('a weekday of 9 in the patch → 400 errors.dayOfWeek, no write', async () => {
      meetingFindFirst.mockResolvedValue(meetingRow);

      await expect400With(
        service.update(userId, courseId, meetingId, { dayOfWeek: 9 }),
        'dayOfWeek'
      );
      expectNoWrite();
    });

    it('a malformed time in the patch → 400 with the field in errors, no write', async () => {
      meetingFindFirst.mockResolvedValue(meetingRow);

      await expect400With(
        service.update(userId, courseId, meetingId, { startTime: '9:00' }),
        'startTime'
      );
      expectNoWrite();
    });

    it('a slot colliding with another meeting of the course (P2002) → 409 with the specific message', async () => {
      meetingFindFirst.mockResolvedValue(meetingRow);
      meetingUpdate.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '7.10.0',
        })
      );

      // All three fields: the merged values must be valid (end > start) so
      // the collision — not a validation error — is what fires.
      const error = await service
        .update(userId, courseId, meetingId, { dayOfWeek: 3, startTime: '14:00', endTime: '15:30' })
        .then(
          () => {
            throw new Error('expected a 409');
          },
          (failure: unknown) => failure
        );

      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).message).toBe('A meeting already exists at this time.');
    });

    it('a P2025 (the row vanished between read and write) → uniform 404', async () => {
      meetingFindFirst.mockResolvedValue(meetingRow);
      meetingUpdate.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record to update not found', {
          code: 'P2025',
          clientVersion: '7.10.0',
        })
      );

      await expect404(service.update(userId, courseId, meetingId, { dayOfWeek: 2 }));
    });

    it('rethrows unrelated errors (the global filter remains the fallback)', async () => {
      meetingFindFirst.mockResolvedValue(meetingRow);
      const unexpected = new Error('boom');
      meetingUpdate.mockRejectedValue(unexpected);

      await expect(service.update(userId, courseId, meetingId, { dayOfWeek: 2 })).rejects.toBe(
        unexpected
      );
    });
  });

  // ==================== delete (DELETE /courses/:id/meetings/:meetingId) ====================

  describe('delete', () => {
    it('scopes the deleteMany to id + course + principal; 1 affected → resolves (204)', async () => {
      meetingDeleteMany.mockResolvedValue({ count: 1 });

      await expect(service.delete(userId, courseId, meetingId)).resolves.toBeUndefined();

      expect(meetingDeleteMany).toHaveBeenCalledWith({
        where: { id: meetingId, courseId, userId },
      });
    });

    it("a dual-ownership miss (missing / another student's / different course) → 0 affected → uniform 404", async () => {
      // Every miss shape affects 0 rows in the scoped `deleteMany`; the
      // real-database distinction between the shapes is pinned in
      // `courses-meetings-data-scoping.spec.ts`.
      meetingDeleteMany.mockResolvedValue({ count: 0 });

      await expect404(service.delete(userId, courseId, meetingId));

      expect(meetingDeleteMany).toHaveBeenCalledWith({
        where: { id: meetingId, courseId, userId },
      });
    });
  });

  // ==================== toMeetingResponse (the shared detail mapping) ====================

  describe('toMeetingResponse', () => {
    it('emits exactly the contract keys, with ISO timestamps, never userId/courseId', () => {
      const result = toMeetingResponse(meetingRow);

      expect(Object.keys(result).sort()).toEqual(MEETING_KEYS);
      expect(result).not.toHaveProperty('userId');
      expect(result).not.toHaveProperty('courseId');
      expect(result.createdAt).toBe('2026-10-18T12:00:00.000Z');
      expect(result.updatedAt).toBe('2026-10-18T12:00:00.000Z');
    });
  });
});
