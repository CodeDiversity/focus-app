import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RESOURCE_NOT_FOUND } from '../../common/ownership/ownership';
import { AvailabilityService } from './availability.service';
import { CreateAvailabilitySlotDto } from './dto/create-availability-slot.dto';

/**
 * SP-128A unit spec (mocked PrismaService, no database): pins the
 * availability-slot service semantics for the four top-level routes
 * (`GET/POST /availability-slots`, `PATCH/DELETE /availability-slots/:id`).
 *
 * - list: a principal-scoped `findMany`, ordered `dayOfWeek` asc /
 *   `startTime` asc, projected to the 7-key `AvailabilitySlot` shape
 *   (never `userId`).
 * - create: field-level 400s (dayOfWeek 0–6 integer, `HH:mm` format +
 *   hour/minute bounds, `endTime` strictly after `startTime` — no midnight
 *   wrap; an unknown `userId` field included); nothing written on failure;
 *   `isAvailable` omitted → the schema default (`true`), explicit `false`
 * → a blocked time; P2002 on `(userId, dayOfWeek, startTime)` → 409.
 * - update (PATCH): scoped `findFirst({ id, userId })` miss → uniform 404
 *   with no write; at-least-one-field (empty body → 400); merged-value
 *   validation; partial write of only the provided fields; P2002 → 409;
 *   P2025 → 404.
 * - delete: scoped `deleteMany({ id, userId })`; 0 affected → uniform 404
 *   via `assertAffected`.
 */
describe('AvailabilityService (unit, mocked PrismaService)', () => {
  const slotFindFirst = jest.fn();
  const slotFindMany = jest.fn();
  const slotCreate = jest.fn();
  const slotUpdate = jest.fn();
  const slotDeleteMany = jest.fn();

  // Partial mock: the service only touches `prisma.availabilitySlot`.
  const prisma = {
    availabilitySlot: {
      findFirst: slotFindFirst,
      findMany: slotFindMany,
      create: slotCreate,
      update: slotUpdate,
      deleteMany: slotDeleteMany,
    },
  } as unknown as PrismaService;

  let service: AvailabilityService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AvailabilityService(prisma);
  });

  const slotId = 'slot-1';
  const userId = 'user-1';

  const slotRow = {
    id: slotId,
    userId,
    dayOfWeek: 1, // Monday
    startTime: '09:00',
    endTime: '10:30',
    isAvailable: true,
    createdAt: new Date('2026-10-20T12:00:00.000Z'),
    updatedAt: new Date('2026-10-20T12:00:00.000Z'),
  };

  /** The exact `AvailabilitySlot` contract keys (shared API contract). */
  const SLOT_KEYS = [
    'createdAt',
    'dayOfWeek',
    'endTime',
    'id',
    'isAvailable',
    'startTime',
    'updatedAt',
  ].sort();

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

  // ==================== list (GET /availability-slots) ====================

  describe('list', () => {
    it('scopes the query to the principal and orders dayOfWeek/startTime', async () => {
      slotFindMany.mockResolvedValue([
        { ...slotRow, id: 's-1', dayOfWeek: 3, startTime: '14:00', endTime: '15:30' },
        { ...slotRow, id: 's-2' },
      ]);

      const result = await service.list(userId);

      // The principal is in the where; ordering is delegated to the DB.
      expect(slotFindMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      });
      expect(result).toHaveLength(2);
      expect(Object.keys(result[0]).sort()).toEqual(SLOT_KEYS);
      expect(result[0]).not.toHaveProperty('userId');
    });

    it('returns an empty array for a student with no slots', async () => {
      slotFindMany.mockResolvedValue([]);
      await expect(service.list(userId)).resolves.toEqual([]);
    });
  });

  // ==================== create (POST /availability-slots) ====================

  describe('create', () => {
    it('creates with isAvailable defaulting to true (schema default — the field is not written)', async () => {
      slotCreate.mockResolvedValue(slotRow);

      const result = await service.create(userId, { ...validDto });

      expect(slotCreate).toHaveBeenCalledWith({
        data: { userId, dayOfWeek: 1, startTime: '09:00', endTime: '10:30' },
      });
      expect(Object.keys(result).sort()).toEqual(SLOT_KEYS);
      expect(result.isAvailable).toBe(true);
    });

    it('creates an explicit blocked time (isAvailable: false is written)', async () => {
      slotCreate.mockResolvedValue({ ...slotRow, isAvailable: false });

      await service.create(userId, { ...validDto, isAvailable: false });

      expect(slotCreate).toHaveBeenCalledWith({
        data: { userId, dayOfWeek: 1, startTime: '09:00', endTime: '10:30', isAvailable: false },
      });
    });

    it('rejects dayOfWeek 7, -1 and 1.5 with field-level 400s and writes nothing', async () => {
      const cases: { dayOfWeek: number; message: RegExp }[] = [
        { dayOfWeek: 7, message: /between 0 \(Sunday\) and 6 \(Saturday\)/ },
        { dayOfWeek: -1, message: /between 0 \(Sunday\) and 6 \(Saturday\)/ },
        { dayOfWeek: 1.5, message: /must be an integer/ },
      ];
      for (const testCase of cases) {
        const payload = await expect400With(
          service.create(userId, { ...validDto, dayOfWeek: testCase.dayOfWeek }),
          'dayOfWeek'
        );
        expect((payload.errors as Record<string, string[]>).dayOfWeek[0]).toMatch(testCase.message);
      }
      expect(slotCreate).not.toHaveBeenCalled();
    });

    it('rejects a non-HH:mm startTime ("9:00") with a field-level 400', async () => {
      await expect400With(service.create(userId, { ...validDto, startTime: '9:00' }), 'startTime');
      expect(slotCreate).not.toHaveBeenCalled();
    });

    it('rejects out-of-bounds times ("25:00", "09:60") and writes nothing', async () => {
      await expect400With(service.create(userId, { ...validDto, startTime: '25:00' }), 'startTime');
      await expect400With(service.create(userId, { ...validDto, endTime: '09:60' }), 'endTime');
      expect(slotCreate).not.toHaveBeenCalled();
    });

    it('rejects endTime equal to and before startTime (same-day rule, no midnight wrap)', async () => {
      await expect400With(service.create(userId, { ...validDto, endTime: '09:00' }), 'endTime');
      await expect400With(service.create(userId, { ...validDto, endTime: '08:30' }), 'endTime');
      expect(slotCreate).not.toHaveBeenCalled();
    });

    it('rejects an unknown body field including userId with a field-level 400', async () => {
      // Cast: the HTTP path never sees this (the global pipe 400s it
      // first); the service re-check is the defense in depth under test.
      const hostile = {
        ...validDto,
        userId: 'someone-else',
      } as unknown as CreateAvailabilitySlotDto;
      await expect400With(service.create(userId, hostile), 'userId');
      expect(slotCreate).not.toHaveBeenCalled();
    });

    it('maps P2002 on (userId, dayOfWeek, startTime) to a 409', async () => {
      slotCreate.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
        })
      );

      const error = await service.create(userId, { ...validDto }).then(
        (value) => {
          throw new Error(`expected a 409, got ${JSON.stringify(value)}`);
        },
        (failure: unknown) => failure
      );
      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getStatus()).toBe(HttpStatus.CONFLICT);
    });
  });

  // ==================== update (PATCH /availability-slots/:id) ====================

  describe('update', () => {
    it('404s uniformly (missing, foreign, or malformed id) with no write', async () => {
      slotFindFirst.mockResolvedValue(null);
      for (const id of ['missing-id', 'another-students-id', 'not-even-a-uuid']) {
        await expect404(service.update(userId, id, { isAvailable: false }));
      }
      expect(slotUpdate).not.toHaveBeenCalled();
    });

    it('applies a single-field update and writes only the provided field', async () => {
      slotFindFirst.mockResolvedValue(slotRow);
      slotUpdate.mockResolvedValue({ ...slotRow, isAvailable: false });

      const result = await service.update(userId, slotId, { isAvailable: false });

      expect(slotUpdate).toHaveBeenCalledWith({
        where: { id: slotId, userId },
        data: { isAvailable: false },
      });
      expect(result.isAvailable).toBe(false);
    });

    it('merges multiple fields and validates on the merged values', async () => {
      slotFindFirst.mockResolvedValue(slotRow);
      slotUpdate.mockResolvedValue({ ...slotRow, dayOfWeek: 2, startTime: '11:00' });

      const result = await service.update(userId, slotId, {
        dayOfWeek: 2,
        startTime: '11:00',
        endTime: '12:00',
        isAvailable: true,
      });

      // Only the provided fields are written (partial merge).
      expect(slotUpdate).toHaveBeenCalledWith({
        where: { id: slotId, userId },
        data: { dayOfWeek: 2, startTime: '11:00', endTime: '12:00', isAvailable: true },
      });
      expect(result.dayOfWeek).toBe(2);
    });

    it('validates the merged result — a single-field patch that breaks the stored pair is a 400', async () => {
      // Stored 09:00–10:30; patching startTime to 11:00 makes 11:00 > 10:30.
      slotFindFirst.mockResolvedValue(slotRow);
      await expect400With(service.update(userId, slotId, { startTime: '11:00' }), 'endTime');
      expect(slotUpdate).not.toHaveBeenCalled();
    });

    it('rejects an empty body with a 400 before any write', async () => {
      // The ownership read happens first (repo convention); the empty-body
      // check then 400s before the write.
      slotFindFirst.mockResolvedValue(slotRow);
      for (const body of [{}, { startTime: null, endTime: null }]) {
        const error = await service.update(userId, slotId, body).then(
          () => {
            throw new Error('expected a 400');
          },
          (failure: unknown) => failure
        );
        expect(error).toBeInstanceOf(BadRequestException);
      }
      expect(slotUpdate).not.toHaveBeenCalled();
    });

    it('maps a merged duplicate (userId, dayOfWeek, startTime) to a 409', async () => {
      slotFindFirst.mockResolvedValue(slotRow);
      slotUpdate.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
        })
      );

      // Stored Monday 09:00–10:30; a startTime of 10:00 is a valid merged
      // window (10:00 → 10:30) whose (userId, 1, 10:00) key collides.
      const error = await service.update(userId, slotId, { startTime: '10:00' }).then(
        () => {
          throw new Error('expected a 409');
        },
        (failure: unknown) => failure
      );
      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getStatus()).toBe(HttpStatus.CONFLICT);
    });

    it('maps a P2025 between the read and the write to the uniform 404', async () => {
      slotFindFirst.mockResolvedValue(slotRow);
      slotUpdate.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: 'P2025',
          clientVersion: 'test',
        })
      );

      await expect404(service.update(userId, slotId, { isAvailable: false }));
    });
  });

  // ==================== delete (DELETE /availability-slots/:id) ====================

  describe('delete', () => {
    it('deletes through a scoped deleteMany and resolves for the owner', async () => {
      slotDeleteMany.mockResolvedValue({ count: 1 });

      await expect(service.delete(userId, slotId)).resolves.toBeUndefined();

      expect(slotDeleteMany).toHaveBeenCalledWith({ where: { id: slotId, userId } });
    });

    it('404s uniformly when nothing was affected (missing/foreign id, or a repeated delete)', async () => {
      slotDeleteMany.mockResolvedValue({ count: 0 });
      await expect404(service.delete(userId, slotId));
      await expect404(service.delete(userId, 'no-such-id'));
    });
  });
});
