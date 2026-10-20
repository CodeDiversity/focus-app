import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SemestersService } from './semesters.service';
import { UpdateSemesterDto } from './dto/update-semester.dto';
import { RESOURCE_NOT_FOUND } from '../../common/ownership/ownership';

/**
 * Semesters unit spec (mocked PrismaService, no database).
 *
 * SP-107B: pins the `POST /semesters` service semantics.
 *
 * SP-110A: pins the management surface:
 * - list: principal-only `where`, `startDate` desc / `name` asc,
 *   `courseCount` projected from `_count`.
 * - get: `findFirst({ where: { id, userId } })` hit → `SemesterWithCount`;
 *   miss (missing OR foreign) → uniform 404.
 * - patch: merged-value validation matrix (each field alone; `end == start` /
 *   `end < start` on the merged values; over-long/empty name; malformed
 *   dates), empty body → 400, 409 on P2002, 404 on P2025, `isActive: true`
 *   → deactivate-others + activate in one transaction, `isActive: false`
 *   → deactivate only.
 * - delete: setNull on the semester's courses + scoped delete in one
 *   transaction; P2025 → uniform 404, no writes.
 */
describe('SemestersService (unit, mocked PrismaService)', () => {
  const create = jest.fn();
  const findMany = jest.fn();
  const findFirst = jest.fn();
  const update = jest.fn();
  const updateMany = jest.fn();
  const deleteSemester = jest.fn();
  const courseUpdateMany = jest.fn();
  // The array-form transaction: run the (mocked) operations and return
  // their results in order — same shape the service consumes.
  const transaction = jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops));

  // Partial mock: SemestersService only touches `prisma.semester`,
  // `prisma.course` and `prisma.$transaction`.
  const prisma = {
    semester: { create, findMany, findFirst, update, updateMany, delete: deleteSemester },
    course: { updateMany: courseUpdateMany },
    $transaction: transaction,
  } as unknown as PrismaService;

  let service: SemestersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SemestersService(prisma);
  });

  const validDto = {
    name: 'Fall 2026',
    startDate: '2026-09-01',
    endDate: '2026-12-15',
  };

  const createdRow = {
    id: 'semester-1',
    userId: 'user-1',
    name: 'Fall 2026',
    startDate: new Date('2026-09-01T00:00:00.000Z'),
    endDate: new Date('2026-12-15T00:00:00.000Z'),
    isActive: false,
    createdAt: new Date('2026-10-18T12:00:00.000Z'),
    updatedAt: new Date('2026-10-18T12:00:00.000Z'),
  };

  const countedRow = { ...createdRow, _count: { courses: 4 } };

  describe('create', () => {
    it("creates the semester with the principal's userId (no id in the request)", async () => {
      create.mockResolvedValue(createdRow);

      await service.create('user-1', validDto);

      expect(create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          name: 'Fall 2026',
          startDate: new Date('2026-09-01T00:00:00.000Z'),
          endDate: new Date('2026-12-15T00:00:00.000Z'),
        },
      });
    });

    it('leaves isActive to the schema default (never in the create data)', async () => {
      create.mockResolvedValue(createdRow);

      await service.create('user-1', validDto);

      const data = create.mock.calls[0][0].data as Record<string, unknown>;
      expect(data).not.toHaveProperty('isActive');
    });

    it('trims the name before storing it', async () => {
      create.mockResolvedValue({ ...createdRow, name: 'Fall 2026' });

      await service.create('user-1', { ...validDto, name: '  Fall 2026  ' });

      const data = create.mock.calls[0][0].data as Record<string, unknown>;
      expect(data.name).toBe('Fall 2026');
    });

    it('serializes dates as yyyy-MM-dd and returns the full API shape', async () => {
      create.mockResolvedValue(createdRow);

      const result = await service.create('user-1', validDto);

      expect(result).toEqual({
        id: 'semester-1',
        name: 'Fall 2026',
        startDate: '2026-09-01',
        endDate: '2026-12-15',
        isActive: false,
        createdAt: '2026-10-18T12:00:00.000Z',
        updatedAt: '2026-10-18T12:00:00.000Z',
      });
    });

    it('accepts a one-day semester range (end strictly after start)', async () => {
      create.mockResolvedValue(createdRow);

      await service.create('user-1', {
        ...validDto,
        startDate: '2026-09-01',
        endDate: '2026-09-02',
      });

      expect(create).toHaveBeenCalledTimes(1);
    });

    it('rejects an impossible calendar date (2026-02-30) with a field-level error', async () => {
      await expect(
        service.create('user-1', { ...validDto, startDate: '2026-02-30' })
      ).rejects.toThrow(BadRequestException);

      // The DTO regex already rejects this shape upstream; the service is
      // the authoritative layer and must not write either.
      expect(create).not.toHaveBeenCalled();
    });
  });

  describe('400 validation (field-level errors map)', () => {
    const expect400With = async (
      dto: { name?: string; startDate?: string; endDate?: string },
      field: string
    ) => {
      const error = await service.create('user-1', { ...validDto, ...dto }).then(
        () => {
          throw new Error('expected a 400');
        },
        (failure: unknown) => failure
      );
      expect(error).toBeInstanceOf(BadRequestException);
      const payload = (error as BadRequestException).getResponse() as Record<string, unknown>;
      expect(payload.errors).toHaveProperty(field);
      expect(create).not.toHaveBeenCalled();
    };

    it('empty name (whitespace-only) → errors.name', async () => {
      await expect400With({ name: '   ' }, 'name');
    });

    it('over-long name (101 chars) → errors.name', async () => {
      await expect400With({ name: 'x'.repeat(101) }, 'name');
    });

    it('malformed startDate → errors.startDate', async () => {
      await expect400With({ startDate: 'not-a-date' }, 'startDate');
    });

    it('malformed endDate → errors.endDate', async () => {
      await expect400With({ endDate: '2026/09/01' }, 'endDate');
    });

    it('impossible endDate (2026-02-30) → errors.endDate', async () => {
      await expect400With({ endDate: '2026-02-30' }, 'endDate');
    });

    it('end == start → errors.endDate (strictly-after rule)', async () => {
      await expect400With({ startDate: '2026-09-01', endDate: '2026-09-01' }, 'endDate');
    });

    it('end < start → errors.endDate', async () => {
      await expect400With({ startDate: '2026-12-15', endDate: '2026-09-01' }, 'endDate');
    });

    it('multiple violations report every offending field', async () => {
      const error = await service
        .create('user-1', {
          name: '   ',
          startDate: 'nope',
          endDate: '2026-02-30',
        })
        .then(
          () => {
            throw new Error('expected a 400');
          },
          (failure: unknown) => failure
        );
      const payload = (error as BadRequestException).getResponse() as Record<string, unknown>;
      const errors = payload.errors as Record<string, string[]>;
      expect(Object.keys(errors).sort()).toEqual(['endDate', 'name', 'startDate']);
      // The stock message array is preserved (D106-6 parity).
      expect(Array.isArray(payload.message)).toBe(true);
    });
  });

  describe('409 duplicate name', () => {
    it('maps a P2002 from the create to a resource-specific 409', async () => {
      create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '7.10.0',
        })
      );

      const error = await service.create('user-1', validDto).then(
        () => {
          throw new Error('expected a 409');
        },
        (failure: unknown) => failure
      );

      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getStatus()).toBe(HttpStatus.CONFLICT);
      expect((error as ConflictException).message).toBe(
        'A semester with this name already exists.'
      );
    });

    it('rethrows unrelated errors (the global filter remains the fallback)', async () => {
      const unexpected = new Error('boom');
      create.mockRejectedValue(unexpected);

      await expect(service.create('user-1', validDto)).rejects.toBe(unexpected);
    });
  });

  // ==================== SP-110A: list ====================

  describe('list', () => {
    it('queries only the principal, ordered startDate desc then name asc', async () => {
      findMany.mockResolvedValue([]);

      await service.list('user-1');

      expect(findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: { _count: { select: { courses: true } } },
        orderBy: [{ startDate: 'desc' }, { name: 'asc' }],
      });
    });

    it('projects each row to SemesterWithCount (courseCount, yyyy-MM-dd dates, ISO timestamps)', async () => {
      findMany.mockResolvedValue([
        { ...createdRow, _count: { courses: 4 } },
        { ...createdRow, id: 'semester-2', name: 'Spring 2026', _count: { courses: 0 } },
      ]);

      const result = await service.list('user-1');

      expect(result).toEqual([
        {
          id: 'semester-1',
          name: 'Fall 2026',
          startDate: '2026-09-01',
          endDate: '2026-12-15',
          isActive: false,
          createdAt: '2026-10-18T12:00:00.000Z',
          updatedAt: '2026-10-18T12:00:00.000Z',
          courseCount: 4,
        },
        {
          id: 'semester-2',
          name: 'Spring 2026',
          startDate: '2026-09-01',
          endDate: '2026-12-15',
          isActive: false,
          createdAt: '2026-10-18T12:00:00.000Z',
          updatedAt: '2026-10-18T12:00:00.000Z',
          courseCount: 0,
        },
      ]);
    });
  });

  // ==================== SP-110A: get ====================

  describe('get', () => {
    it('returns the SemesterWithCount for an owned row', async () => {
      findFirst.mockResolvedValue(countedRow);

      const result = await service.get('user-1', 'semester-1');

      expect(findFirst).toHaveBeenCalledWith({
        where: { id: 'semester-1', userId: 'user-1' },
        include: { _count: { select: { courses: true } } },
      });
      expect(result).toEqual({
        id: 'semester-1',
        name: 'Fall 2026',
        startDate: '2026-09-01',
        endDate: '2026-12-15',
        isActive: false,
        createdAt: '2026-10-18T12:00:00.000Z',
        updatedAt: '2026-10-18T12:00:00.000Z',
        courseCount: 4,
      });
    });

    it('a missing or foreign id → uniform 404 (no existence oracle)', async () => {
      findFirst.mockResolvedValue(null);

      const error = await service.get('user-2', 'semester-1').then(
        () => {
          throw new Error('expected a 404');
        },
        (failure: unknown) => failure
      );

      expect(error).toBeInstanceOf(NotFoundException);
      expect((error as NotFoundException).getStatus()).toBe(HttpStatus.NOT_FOUND);
      expect((error as NotFoundException).message).toBe(RESOURCE_NOT_FOUND);
    });
  });

  // ==================== SP-110A: update (PATCH) ====================

  describe('update', () => {
    // The stored row the patch merges over: Fall 2026, 09-01 → 12-15.
    const existing = createdRow;

    beforeEach(() => {
      findFirst.mockResolvedValue(existing);
      update.mockResolvedValue({ ...existing, _count: { courses: 1 } });
      updateMany.mockResolvedValue({ count: 0 });
    });

    const expect400With = async (dto: Partial<UpdateSemesterDto>, field: string): Promise<void> => {
      const error = await service.update('user-1', 'semester-1', dto).then(
        () => {
          throw new Error('expected a 400');
        },
        (failure: unknown) => failure
      );
      expect(error).toBeInstanceOf(BadRequestException);
      const payload = (error as BadRequestException).getResponse() as Record<string, unknown>;
      expect(payload.errors).toHaveProperty(field);
      expect(update).not.toHaveBeenCalled();
      expect(updateMany).not.toHaveBeenCalled();
      expect(transaction).not.toHaveBeenCalled();
    };

    it('an empty body → 400 "at least one field", nothing written', async () => {
      const error = await service.update('user-1', 'semester-1', {}).then(
        () => {
          throw new Error('expected a 400');
        },
        (failure: unknown) => failure
      );
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).message).toBe('At least one field must be provided');
      expect(update).not.toHaveBeenCalled();
      expect(updateMany).not.toHaveBeenCalled();
      expect(transaction).not.toHaveBeenCalled();
    });

    it('a missing or foreign id → uniform 404 before any validation or write', async () => {
      findFirst.mockResolvedValue(null);

      const error = await service.update('user-2', 'semester-1', { name: 'X' }).then(
        () => {
          throw new Error('expected a 404');
        },
        (failure: unknown) => failure
      );

      expect(error).toBeInstanceOf(NotFoundException);
      expect((error as NotFoundException).message).toBe(RESOURCE_NOT_FOUND);
      expect(update).not.toHaveBeenCalled();
      expect(updateMany).not.toHaveBeenCalled();
      expect(transaction).not.toHaveBeenCalled();
    });

    it('a name-only patch writes only the (trimmed) name', async () => {
      await service.update('user-1', 'semester-1', { name: '  Fall 2026 Renamed  ' });

      expect(update).toHaveBeenCalledWith({
        where: { id: 'semester-1', userId: 'user-1' },
        data: { name: 'Fall 2026 Renamed' },
        include: { _count: { select: { courses: true } } },
      });
      expect(transaction).not.toHaveBeenCalled();
      expect(updateMany).not.toHaveBeenCalled();
    });

    it('a startDate-only patch writes only the parsed date (merged end stays valid)', async () => {
      await service.update('user-1', 'semester-1', { startDate: '2026-09-05' });

      expect(update).toHaveBeenCalledWith({
        where: { id: 'semester-1', userId: 'user-1' },
        data: { startDate: new Date('2026-09-05T00:00:00.000Z') },
        include: { _count: { select: { courses: true } } },
      });
    });

    it('an endDate-only patch writes only the parsed date', async () => {
      await service.update('user-1', 'semester-1', { endDate: '2026-12-20' });

      expect(update).toHaveBeenCalledWith({
        where: { id: 'semester-1', userId: 'user-1' },
        data: { endDate: new Date('2026-12-20T00:00:00.000Z') },
        include: { _count: { select: { courses: true } } },
      });
    });

    it('an explicit null field is treated as omitted (partial merge)', async () => {
      await service.update('user-1', 'semester-1', { name: null, endDate: '2026-12-20' });

      const data = update.mock.calls[0][0].data as Record<string, unknown>;
      expect(data).not.toHaveProperty('name');
      expect(data).toEqual({ endDate: new Date('2026-12-20T00:00:00.000Z') });
    });

    it('merged end == start → 400 with endDate in errors (nothing written)', async () => {
      // Patching the stored end back onto the stored start: the merged
      // values violate the strictly-after rule even though the string is
      // well-formed.
      await expect400With({ endDate: '2026-09-01' }, 'endDate');
    });

    it('merged end < start → 400 with endDate in errors', async () => {
      await expect400With({ endDate: '2026-08-01' }, 'endDate');
    });

    it('a startDate after the stored end → 400 with endDate in errors (merged values)', async () => {
      await expect400With({ startDate: '2026-12-20' }, 'endDate');
    });

    it('an over-long merged name → 400 with name in errors', async () => {
      await expect400With({ name: 'x'.repeat(101) }, 'name');
    });

    it('a whitespace-only merged name → 400 with name in errors', async () => {
      await expect400With({ name: '   ' }, 'name');
    });

    it('an impossible merged date (2026-02-30) → 400 with startDate in errors', async () => {
      await expect400With({ startDate: '2026-02-30' }, 'startDate');
    });

    it('a malformed merged date → 400 with the field in errors', async () => {
      await expect400With({ endDate: 'not-a-date' }, 'endDate');
    });

    it('a name colliding with another of the student semesters (P2002) → specific 409', async () => {
      update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '7.10.0',
        })
      );

      const error = await service.update('user-1', 'semester-1', { name: 'Spring 2026' }).then(
        () => {
          throw new Error('expected a 409');
        },
        (failure: unknown) => failure
      );

      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).message).toBe(
        'A semester with this name already exists.'
      );
    });

    it('a target that vanished between read and write (P2025) → uniform 404', async () => {
      update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record to update not found', {
          code: 'P2025',
          clientVersion: '7.10.0',
        })
      );

      const error = await service.update('user-1', 'semester-1', { name: 'X' }).then(
        () => {
          throw new Error('expected a 404');
        },
        (failure: unknown) => failure
      );

      expect(error).toBeInstanceOf(NotFoundException);
      expect((error as NotFoundException).message).toBe(RESOURCE_NOT_FOUND);
    });

    it('returns the updated SemesterWithCount', async () => {
      update.mockResolvedValue({
        ...existing,
        name: 'Fall 2026 Renamed',
        _count: { courses: 2 },
      });

      const result = await service.update('user-1', 'semester-1', { name: 'Fall 2026 Renamed' });

      expect(result).toEqual({
        id: 'semester-1',
        name: 'Fall 2026 Renamed',
        startDate: '2026-09-01',
        endDate: '2026-12-15',
        isActive: false,
        createdAt: '2026-10-18T12:00:00.000Z',
        updatedAt: '2026-10-18T12:00:00.000Z',
        courseCount: 2,
      });
    });

    // ---------- activation (D110-1) ----------

    it('isActive: true → ONE transaction: deactivate all other semesters of the student + activate the target', async () => {
      await service.update('user-1', 'semester-1', { isActive: true });

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', NOT: { id: 'semester-1' } },
        data: { isActive: false },
      });
      expect(update).toHaveBeenCalledWith({
        where: { id: 'semester-1', userId: 'user-1' },
        data: { isActive: true },
        include: { _count: { select: { courses: true } } },
      });
      // The deactivation is scoped to the principal — never another student.
      const deactivationWhere = updateMany.mock.calls[0][0].where as Record<string, unknown>;
      expect(deactivationWhere.userId).toBe('user-1');
    });

    it('isActive: true with other fields → both in the activating write', async () => {
      await service.update('user-1', 'semester-1', {
        name: 'Fall 2026 Renamed',
        isActive: true,
      });

      expect(update).toHaveBeenCalledWith({
        where: { id: 'semester-1', userId: 'user-1' },
        data: { name: 'Fall 2026 Renamed', isActive: true },
        include: { _count: { select: { courses: true } } },
      });
    });

    it('isActive: false → deactivates only the target (no deactivate-others, no transaction)', async () => {
      await service.update('user-1', 'semester-1', { isActive: false });

      expect(update).toHaveBeenCalledWith({
        where: { id: 'semester-1', userId: 'user-1' },
        data: { isActive: false },
        include: { _count: { select: { courses: true } } },
      });
      expect(updateMany).not.toHaveBeenCalled();
      expect(transaction).not.toHaveBeenCalled();
    });
  });

  // ==================== SP-110A: delete ====================

  describe('delete', () => {
    it('orphans the semester courses and deletes the semester in ONE transaction (D110-2)', async () => {
      courseUpdateMany.mockResolvedValue({ count: 2 });
      deleteSemester.mockResolvedValue({});

      await service.delete('user-1', 'semester-1');

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(courseUpdateMany).toHaveBeenCalledWith({
        where: { semesterId: 'semester-1', userId: 'user-1' },
        data: { semesterId: null },
      });
      expect(deleteSemester).toHaveBeenCalledWith({
        where: { id: 'semester-1', userId: 'user-1' },
      });
    });

    it('a missing or foreign id → uniform 404 and the transaction rolls back (no writes)', async () => {
      courseUpdateMany.mockResolvedValue({ count: 0 });
      deleteSemester.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record to delete does not exist', {
          code: 'P2025',
          clientVersion: '7.10.0',
        })
      );

      const error = await service.delete('user-2', 'semester-1').then(
        () => {
          throw new Error('expected a 404');
        },
        (failure: unknown) => failure
      );

      expect(error).toBeInstanceOf(NotFoundException);
      expect((error as NotFoundException).message).toBe(RESOURCE_NOT_FOUND);
    });

    it('rethrows unrelated errors (the global filter remains the fallback)', async () => {
      const unexpected = new Error('boom');
      deleteSemester.mockRejectedValue(unexpected);

      await expect(service.delete('user-1', 'semester-1')).rejects.toBe(unexpected);
    });
  });
});
