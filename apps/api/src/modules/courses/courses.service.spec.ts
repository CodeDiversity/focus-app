import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RESOURCE_NOT_FOUND } from '../../common/ownership/ownership';
import { CoursesService } from './courses.service';

/**
 * SP-107B + SP-111A unit spec (mocked PrismaService, no database): pins the
 * course-management service semantics.
 *
 * - create: principal's `userId`; optional fields (incl. `instructor`,
 *   D111-1) pass through, omitted fields stay out of `data` (schema
 *   defaults apply); 400 field-level errors; 409 on duplicate code (P2002);
 *   `semesterId` ownership miss → uniform 404, no write.
 * - list: principal-scoped `findMany`, `name` asc / `code` asc, active-only
 *   by default, `includeArchived` drops the `isActive` filter, owned
 *   `semesterId` filter passes through, foreign/missing `semesterId` →
 *   uniform 404 with no list query.
 * - get: `findFirst({ where: { id, userId } })` hit (active **and**
 *   archived) → `CourseWithSemester` shape; miss → uniform 404.
 * - update (PATCH): partial merge — each field alone; merged-value
 *   violations → 400 with the field in `errors`, no write; foreign
 *   `semesterId` → 404 with no write; code-collision P2002 → 409;
 *   `isActive` flip returns the updated shape (archive/restore, D111-2).
 * - response: `toResponse` emits the `CourseWithSemester` keys exactly
 *   (D111-4).
 */
describe('CoursesService (unit, mocked PrismaService)', () => {
  const semesterFindFirst = jest.fn();
  const courseFindFirst = jest.fn();
  const courseFindMany = jest.fn();
  const courseCreate = jest.fn();
  const courseUpdate = jest.fn();

  // Partial mock: CoursesService only touches `prisma.semester` and
  // `prisma.course`.
  const prisma = {
    semester: { findFirst: semesterFindFirst },
    course: {
      create: courseCreate,
      findFirst: courseFindFirst,
      findMany: courseFindMany,
      update: courseUpdate,
    },
  } as unknown as PrismaService;

  let service: CoursesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CoursesService(prisma);
  });

  const validDto = { code: 'CS101', name: 'Intro to Computer Science' };

  /** The semester projection every course query includes (contract). */
  const SEMESTER_PROJECTION = { semester: { select: { id: true, name: true } } };

  const createdRow = {
    id: 'course-1',
    userId: 'user-1',
    semesterId: null,
    code: 'CS101',
    name: 'Intro to Computer Science',
    description: null,
    color: '#6366f1',
    credits: null,
    instructor: null,
    isActive: true,
    semester: null,
    createdAt: new Date('2026-10-18T12:00:00.000Z'),
    updatedAt: new Date('2026-10-18T12:00:00.000Z'),
  };

  /** The exact `CourseWithSemester` contract keys (D111-4). */
  const COURSE_WITH_SEMESTER_KEYS = [
    'code',
    'color',
    'credits',
    'createdAt',
    'description',
    'id',
    'instructor',
    'isActive',
    'name',
    'semester',
    'semesterId',
    'updatedAt',
  ].sort();

  describe('create', () => {
    it("creates the course with the principal's userId", async () => {
      semesterFindFirst.mockResolvedValue(null); // semesterId omitted → no lookup
      courseCreate.mockResolvedValue(createdRow);

      await service.create('user-1', validDto);

      expect(courseCreate).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          code: 'CS101',
          name: 'Intro to Computer Science',
          semesterId: null,
        },
        include: SEMESTER_PROJECTION,
      });
      expect(semesterFindFirst).not.toHaveBeenCalled();
    });

    it('passes optional fields through when provided', async () => {
      semesterFindFirst.mockResolvedValue({ id: 'semester-1' });
      courseCreate.mockResolvedValue(createdRow);

      await service.create('user-1', {
        ...validDto,
        semesterId: 'semester-1',
        description: 'The first course',
        credits: 4,
        color: '#ff0000',
      });

      expect(courseCreate).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          code: 'CS101',
          name: 'Intro to Computer Science',
          semesterId: 'semester-1',
          description: 'The first course',
          credits: 4,
          color: '#ff0000',
        },
        include: SEMESTER_PROJECTION,
      });
    });

    it('omits optional fields from the data when absent (schema defaults apply)', async () => {
      courseCreate.mockResolvedValue(createdRow);

      await service.create('user-1', validDto);

      const data = courseCreate.mock.calls[0][0].data as Record<string, unknown>;
      expect(data).not.toHaveProperty('description');
      expect(data).not.toHaveProperty('credits');
      expect(data).not.toHaveProperty('color');
      expect(data).not.toHaveProperty('instructor');
      expect(data).not.toHaveProperty('isActive');
    });

    it('serializes the created row to the CourseWithSemester shape (D111-4)', async () => {
      courseCreate.mockResolvedValue(createdRow);

      const result = await service.create('user-1', validDto);

      expect(Object.keys(result).sort()).toEqual(COURSE_WITH_SEMESTER_KEYS);
      expect(result).toEqual({
        id: 'course-1',
        code: 'CS101',
        name: 'Intro to Computer Science',
        description: null,
        color: '#6366f1',
        credits: null,
        instructor: null,
        isActive: true,
        semesterId: null,
        semester: null,
        createdAt: '2026-10-18T12:00:00.000Z',
        updatedAt: '2026-10-18T12:00:00.000Z',
      });
    });

    it('trims code and name before storing them', async () => {
      courseCreate.mockResolvedValue(createdRow);

      await service.create('user-1', { code: '  CS101  ', name: '  Intro  ' });

      const data = courseCreate.mock.calls[0][0].data as Record<string, unknown>;
      expect(data.code).toBe('CS101');
      expect(data.name).toBe('Intro');
    });

    // ==================== instructor (D111-1) ====================

    it('accepts and trims a provided instructor', async () => {
      courseCreate.mockResolvedValue({ ...createdRow, instructor: 'Dr. Smith' });

      await service.create('user-1', { ...validDto, instructor: '  Dr. Smith  ' });

      const data = courseCreate.mock.calls[0][0].data as Record<string, unknown>;
      expect(data.instructor).toBe('Dr. Smith');
    });

    it('omits instructor from the data when absent (schema NULL applies)', async () => {
      courseCreate.mockResolvedValue(createdRow);

      await service.create('user-1', validDto);

      const data = courseCreate.mock.calls[0][0].data as Record<string, unknown>;
      expect(data).not.toHaveProperty('instructor');
      expect((await service.create('user-1', validDto)).instructor).toBeNull();
    });

    it('a whitespace-only instructor → 400 with instructor in errors, no write', async () => {
      const error = await service.create('user-1', { ...validDto, instructor: '   ' }).then(
        () => {
          throw new Error('expected a 400');
        },
        (failure: unknown) => failure
      );
      expect(error).toBeInstanceOf(BadRequestException);
      const payload = (error as BadRequestException).getResponse() as Record<string, unknown>;
      expect(payload.errors).toHaveProperty('instructor');
      expect(courseCreate).not.toHaveBeenCalled();
    });

    it('an over-long instructor (101 chars) → 400 with instructor in errors', async () => {
      const error = await service
        .create('user-1', { ...validDto, instructor: 'x'.repeat(101) })
        .then(
          () => {
            throw new Error('expected a 400');
          },
          (failure: unknown) => failure
        );
      expect(error).toBeInstanceOf(BadRequestException);
      const payload = (error as BadRequestException).getResponse() as Record<string, unknown>;
      expect(payload.errors).toHaveProperty('instructor');
      expect(courseCreate).not.toHaveBeenCalled();
    });

    it('accepts a 100-char instructor (boundary)', async () => {
      courseCreate.mockResolvedValue(createdRow);

      await service.create('user-1', { ...validDto, instructor: 'x'.repeat(100) });

      expect(courseCreate).toHaveBeenCalledTimes(1);
    });
  });

  describe('400 validation (field-level errors map)', () => {
    const expect400With = async (dto: Record<string, unknown>, field: string) => {
      const error = await service.create('user-1', { ...validDto, ...dto }).then(
        () => {
          throw new Error('expected a 400');
        },
        (failure: unknown) => failure
      );
      expect(error).toBeInstanceOf(BadRequestException);
      const payload = (error as BadRequestException).getResponse() as Record<string, unknown>;
      expect(payload.errors).toHaveProperty(field);
      expect(courseCreate).not.toHaveBeenCalled();
      expect(semesterFindFirst).not.toHaveBeenCalled();
    };

    it('empty code (whitespace-only) → errors.code', async () => {
      await expect400With({ code: '   ' }, 'code');
    });

    it('over-long code (21 chars) → errors.code', async () => {
      await expect400With({ code: 'x'.repeat(21) }, 'code');
    });

    it('empty name (whitespace-only) → errors.name', async () => {
      await expect400With({ name: '   ' }, 'name');
    });

    it('over-long name (101 chars) → errors.name', async () => {
      await expect400With({ name: 'x'.repeat(101) }, 'name');
    });

    it('credits of 0 → errors.credits (0 < c)', async () => {
      await expect400With({ credits: 0 }, 'credits');
    });

    it('negative credits → errors.credits', async () => {
      await expect400With({ credits: -2 }, 'credits');
    });

    it('credits above 30 → errors.credits (c ≤ 30)', async () => {
      await expect400With({ credits: 31 }, 'credits');
    });

    it('a malformed color → errors.color', async () => {
      for (const color of ['#12345', '123456', 'red', '#GGGGGG']) {
        jest.clearAllMocks();
        const error = await service.create('user-1', { ...validDto, color }).then(
          () => {
            throw new Error('expected a 400');
          },
          (failure: unknown) => failure
        );
        const payload = (error as BadRequestException).getResponse() as Record<string, unknown>;
        expect(payload.errors).toHaveProperty('color');
        expect(courseCreate).not.toHaveBeenCalled();
      }
    });

    it('an over-long description (2001 chars) → errors.description', async () => {
      await expect400With({ description: 'x'.repeat(2001) }, 'description');
    });

    it('accepts boundary values (credits 30, 6-hex color, 2000-char description)', async () => {
      courseCreate.mockResolvedValue(createdRow);

      await service.create('user-1', {
        ...validDto,
        credits: 30,
        color: '#abcdef',
        description: 'x'.repeat(2000),
      });

      expect(courseCreate).toHaveBeenCalledTimes(1);
    });
  });

  describe('409 duplicate code', () => {
    it('maps a P2002 from the create to a resource-specific 409', async () => {
      courseCreate.mockRejectedValue(
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
      expect((error as ConflictException).message).toBe('A course with this code already exists.');
    });

    it('rethrows unrelated errors (the global filter remains the fallback)', async () => {
      const unexpected = new Error('boom');
      courseCreate.mockRejectedValue(unexpected);

      await expect(service.create('user-1', validDto)).rejects.toBe(unexpected);
    });
  });

  describe('semesterId ownership', () => {
    it('a missing semester (findFirst miss) → uniform 404, no course row written', async () => {
      semesterFindFirst.mockResolvedValue(null);

      const error = await service
        .create('user-1', { ...validDto, semesterId: 'someone-elses-semester' })
        .then(
          () => {
            throw new Error('expected a 404');
          },
          (failure: unknown) => failure
        );

      expect(error).toBeInstanceOf(NotFoundException);
      expect((error as NotFoundException).getStatus()).toBe(HttpStatus.NOT_FOUND);
      expect((error as NotFoundException).message).toBe(RESOURCE_NOT_FOUND);
      // The ownership lookup is scoped to the requesting student…
      expect(semesterFindFirst).toHaveBeenCalledWith({
        where: { id: 'someone-elses-semester', userId: 'user-1' },
        select: { id: true },
      });
      // …and nothing is written on a miss.
      expect(courseCreate).not.toHaveBeenCalled();
    });

    it('an owned semester (findFirst hit) → the id is passed through', async () => {
      semesterFindFirst.mockResolvedValue({ id: 'semester-1' });
      courseCreate.mockResolvedValue(createdRow);

      await service.create('user-1', { ...validDto, semesterId: 'semester-1' });

      const data = courseCreate.mock.calls[0][0].data as Record<string, unknown>;
      expect(data.semesterId).toBe('semester-1');
    });

    it('an omitted semesterId → null without a lookup', async () => {
      courseCreate.mockResolvedValue(createdRow);

      await service.create('user-1', validDto);

      expect(semesterFindFirst).not.toHaveBeenCalled();
      const data = courseCreate.mock.calls[0][0].data as Record<string, unknown>;
      expect(data.semesterId).toBeNull();
    });

    it('an explicit null semesterId → null without a lookup', async () => {
      courseCreate.mockResolvedValue(createdRow);

      await service.create('user-1', { ...validDto, semesterId: null });

      expect(semesterFindFirst).not.toHaveBeenCalled();
      const data = courseCreate.mock.calls[0][0].data as Record<string, unknown>;
      expect(data.semesterId).toBeNull();
    });
  });

  // ==================== list (SP-111A) ====================

  describe('list', () => {
    const rowWithSemester = {
      ...createdRow,
      id: 'course-2',
      code: 'CS102',
      name: 'Algorithms',
      semesterId: 'semester-1',
      semester: { id: 'semester-1', name: 'Fall 2026' },
    };
    const archivedRow = {
      ...createdRow,
      id: 'course-3',
      code: 'CS103',
      name: 'Databases',
      isActive: false,
    };

    it('queries only the principal, active by default, ordered name asc / code asc', async () => {
      courseFindMany.mockResolvedValue([rowWithSemester, archivedRow]);

      const result = await service.list('user-1');

      expect(courseFindMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isActive: true },
        include: SEMESTER_PROJECTION,
        orderBy: [{ name: 'asc' }, { code: 'asc' }],
      });
      expect(result).toHaveLength(2);
      // The semester projects as { id, name } | null (D111-4).
      expect(result[0].semester).toEqual({ id: 'semester-1', name: 'Fall 2026' });
      expect(result[1].semester).toBeNull();
    });

    it('includeArchived drops the isActive filter (D111-3)', async () => {
      courseFindMany.mockResolvedValue([]);

      await service.list('user-1', { includeArchived: true });

      expect(courseFindMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: SEMESTER_PROJECTION,
        orderBy: [{ name: 'asc' }, { code: 'asc' }],
      });
    });

    it('an owned semesterId filter is included in the where', async () => {
      semesterFindFirst.mockResolvedValue({ id: 'semester-1' });
      courseFindMany.mockResolvedValue([]);

      await service.list('user-1', { semesterId: 'semester-1' });

      expect(semesterFindFirst).toHaveBeenCalledWith({
        where: { id: 'semester-1', userId: 'user-1' },
        select: { id: true },
      });
      expect(courseFindMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', semesterId: 'semester-1', isActive: true },
        include: SEMESTER_PROJECTION,
        orderBy: [{ name: 'asc' }, { code: 'asc' }],
      });
    });

    it('a foreign or missing semesterId → uniform 404, no list query (no existence oracle)', async () => {
      semesterFindFirst.mockResolvedValue(null);

      const error = await service.list('user-1', { semesterId: 'someone-elses-semester' }).then(
        () => {
          throw new Error('expected a 404');
        },
        (failure: unknown) => failure
      );

      expect(error).toBeInstanceOf(NotFoundException);
      expect((error as NotFoundException).message).toBe(RESOURCE_NOT_FOUND);
      expect(courseFindMany).not.toHaveBeenCalled();
    });

    it('omits semesterId and includeArchived from the where when not provided', async () => {
      courseFindMany.mockResolvedValue([]);

      await service.list('user-1');

      const where = courseFindMany.mock.calls[0][0].where as Record<string, unknown>;
      expect(where).not.toHaveProperty('semesterId');
    });
  });

  // ==================== get (SP-111A) ====================

  describe('get', () => {
    it('returns the course regardless of archive state (AC-E02-05)', async () => {
      courseFindFirst.mockResolvedValue({ ...createdRow, isActive: false });

      const result = await service.get('user-1', 'course-1');

      expect(courseFindFirst).toHaveBeenCalledWith({
        where: { id: 'course-1', userId: 'user-1' },
        include: SEMESTER_PROJECTION,
      });
      expect(result).toMatchObject({ id: 'course-1', isActive: false });
      expect(Object.keys(result).sort()).toEqual(COURSE_WITH_SEMESTER_KEYS);
    });

    it('a missing id or another student id → uniform 404 (no existence oracle)', async () => {
      courseFindFirst.mockResolvedValue(null);

      const error = await service.get('user-1', 'course-1').then(
        () => {
          throw new Error('expected a 404');
        },
        (failure: unknown) => failure
      );

      expect(error).toBeInstanceOf(NotFoundException);
      expect((error as NotFoundException).message).toBe(RESOURCE_NOT_FOUND);
      // The ownership predicate is in the query.
      expect(courseFindFirst).toHaveBeenCalledWith({
        where: { id: 'course-1', userId: 'user-1' },
        include: SEMESTER_PROJECTION,
      });
    });
  });

  // ==================== update / PATCH (SP-111A) ====================

  describe('update (partial merge)', () => {
    const existingRow = createdRow; // active, unaffiliated, no instructor

    const expectNoWrite = () => {
      expect(courseUpdate).not.toHaveBeenCalled();
    };

    const expect400With = async (dto: Record<string, unknown>, field: string) => {
      courseFindFirst.mockResolvedValue(existingRow);
      const error = await service.update('user-1', 'course-1', dto).then(
        () => {
          throw new Error('expected a 400');
        },
        (failure: unknown) => failure
      );
      expect(error).toBeInstanceOf(BadRequestException);
      const payload = (error as BadRequestException).getResponse() as Record<string, unknown>;
      expect(payload.errors).toHaveProperty(field);
      expectNoWrite();
    };

    it.each([
      ['code', { code: 'CS101X' }],
      ['name', { name: 'Renamed Course' }],
      ['description', { description: 'A description' }],
      ['credits', { credits: 4 }],
      ['color', { color: '#00ff00' }],
      ['instructor', { instructor: 'Dr. Smith' }],
      ['isActive', { isActive: false }],
    ] as const)('writes only the provided field (%s)', async (_field, dto) => {
      courseFindFirst.mockResolvedValue(existingRow);
      courseUpdate.mockResolvedValue(existingRow);

      await service.update('user-1', 'course-1', dto);

      const data = courseUpdate.mock.calls[0][0].data as Record<string, unknown>;
      expect(Object.keys(data)).toEqual([Object.keys(dto)[0]]);
      expect(courseUpdate).toHaveBeenCalledWith({
        where: { id: 'course-1', userId: 'user-1' },
        data: dto as Record<string, unknown>,
        include: SEMESTER_PROJECTION,
      });
    });

    it('an empty body → 400 "At least one field must be provided"', async () => {
      courseFindFirst.mockResolvedValue(existingRow);

      const error = await service.update('user-1', 'course-1', {}).then(
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
      courseFindFirst.mockResolvedValue(existingRow);

      const error = await service.update('user-1', 'course-1', { name: null }).then(
        () => {
          throw new Error('expected a 400');
        },
        (failure: unknown) => failure
      );

      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).message).toBe('At least one field must be provided');
      expectNoWrite();
    });

    it('a missing course (findFirst miss) → uniform 404, no write', async () => {
      courseFindFirst.mockResolvedValue(null);

      const error = await service.update('user-1', 'course-1', { name: 'X' }).then(
        () => {
          throw new Error('expected a 404');
        },
        (failure: unknown) => failure
      );

      expect(error).toBeInstanceOf(NotFoundException);
      expect((error as NotFoundException).message).toBe(RESOURCE_NOT_FOUND);
      expectNoWrite();
    });

    // Merged-value validation (the service re-checks the post-patch values).

    it('a whitespace-only code patch → 400 errors.code, no write', async () => {
      await expect400With({ code: '   ' }, 'code');
    });

    it('an over-long code patch (21 chars) → 400 errors.code, no write', async () => {
      await expect400With({ code: 'x'.repeat(21) }, 'code');
    });

    it('a whitespace-only name patch → 400 errors.name, no write', async () => {
      await expect400With({ name: '   ' }, 'name');
    });

    it('an over-long name patch (101 chars) → 400 errors.name, no write', async () => {
      await expect400With({ name: 'x'.repeat(101) }, 'name');
    });

    it('credits of 0 → 400 errors.credits, no write', async () => {
      await expect400With({ credits: 0 }, 'credits');
    });

    it('credits above 30 → 400 errors.credits, no write', async () => {
      await expect400With({ credits: 31 }, 'credits');
    });

    it('a malformed color patch → 400 errors.color, no write', async () => {
      await expect400With({ color: 'red' }, 'color');
    });

    it('an over-long description patch (2001 chars) → 400 errors.description, no write', async () => {
      await expect400With({ description: 'x'.repeat(2001) }, 'description');
    });

    it('a whitespace-only instructor patch → 400 errors.instructor, no write', async () => {
      await expect400With({ instructor: '   ' }, 'instructor');
    });

    it('an over-long instructor patch (101 chars) → 400 errors.instructor, no write', async () => {
      await expect400With({ instructor: 'x'.repeat(101) }, 'instructor');
    });

    it('trims the patched code/name/instructor before storing', async () => {
      courseFindFirst.mockResolvedValue(existingRow);
      courseUpdate.mockResolvedValue(existingRow);

      await service.update('user-1', 'course-1', {
        code: '  CS101X  ',
        name: '  Renamed  ',
        instructor: '  Dr. Smith  ',
      });

      const data = courseUpdate.mock.calls[0][0].data as Record<string, unknown>;
      expect(data).toEqual({ code: 'CS101X', name: 'Renamed', instructor: 'Dr. Smith' });
    });

    // semesterId ownership on the patch path.

    it('a foreign semesterId → uniform 404, no write (AC-E02-02)', async () => {
      courseFindFirst.mockResolvedValue(existingRow);
      semesterFindFirst.mockResolvedValue(null);

      const error = await service.update('user-1', 'course-1', { semesterId: 'foreign' }).then(
        () => {
          throw new Error('expected a 404');
        },
        (failure: unknown) => failure
      );

      expect(error).toBeInstanceOf(NotFoundException);
      expect((error as NotFoundException).message).toBe(RESOURCE_NOT_FOUND);
      expect(semesterFindFirst).toHaveBeenCalledWith({
        where: { id: 'foreign', userId: 'user-1' },
        select: { id: true },
      });
      expectNoWrite();
    });

    it('an owned semesterId → written through', async () => {
      courseFindFirst.mockResolvedValue(existingRow);
      semesterFindFirst.mockResolvedValue({ id: 'semester-1' });
      courseUpdate.mockResolvedValue(existingRow);

      await service.update('user-1', 'course-1', { semesterId: 'semester-1' });

      expect(courseUpdate).toHaveBeenCalledWith({
        where: { id: 'course-1', userId: 'user-1' },
        data: { semesterId: 'semester-1' },
        include: SEMESTER_PROJECTION,
      });
    });

    // Archive / restore (D111-2).

    it('isActive: false archives and returns the updated shape', async () => {
      courseFindFirst.mockResolvedValue(existingRow);
      courseUpdate.mockResolvedValue({ ...existingRow, isActive: false });

      const result = await service.update('user-1', 'course-1', { isActive: false });

      expect(courseUpdate).toHaveBeenCalledWith({
        where: { id: 'course-1', userId: 'user-1' },
        data: { isActive: false },
        include: SEMESTER_PROJECTION,
      });
      expect(result).toMatchObject({ id: 'course-1', isActive: false });
    });

    it('isActive: true restores and returns the updated shape', async () => {
      courseFindFirst.mockResolvedValue({ ...existingRow, isActive: false });
      courseUpdate.mockResolvedValue(existingRow);

      const result = await service.update('user-1', 'course-1', { isActive: true });

      expect(result).toMatchObject({ id: 'course-1', isActive: true });
    });

    // Uniqueness + races.

    it('a code collision with a different course (P2002) → 409 with the specific message', async () => {
      courseFindFirst.mockResolvedValue(existingRow);
      courseUpdate.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '7.10.0',
        })
      );

      const error = await service.update('user-1', 'course-1', { code: 'CS102' }).then(
        () => {
          throw new Error('expected a 409');
        },
        (failure: unknown) => failure
      );

      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).message).toBe('A course with this code already exists.');
    });

    it('a P2025 (the row vanished between read and write) → uniform 404', async () => {
      courseFindFirst.mockResolvedValue(existingRow);
      courseUpdate.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record to update not found', {
          code: 'P2025',
          clientVersion: '7.10.0',
        })
      );

      const error = await service.update('user-1', 'course-1', { name: 'X' }).then(
        () => {
          throw new Error('expected a 404');
        },
        (failure: unknown) => failure
      );

      expect(error).toBeInstanceOf(NotFoundException);
      expect((error as NotFoundException).message).toBe(RESOURCE_NOT_FOUND);
    });

    it('rethrows unrelated errors (the global filter remains the fallback)', async () => {
      courseFindFirst.mockResolvedValue(existingRow);
      const unexpected = new Error('boom');
      courseUpdate.mockRejectedValue(unexpected);

      await expect(service.update('user-1', 'course-1', { name: 'X' })).rejects.toBe(unexpected);
    });
  });

  // ==================== toResponse (D111-4) ====================

  describe('toResponse (CourseWithSemester)', () => {
    it('emits exactly the contract keys, with the semester projection or null', async () => {
      courseCreate.mockResolvedValue({
        ...createdRow,
        semesterId: 'semester-1',
        semester: { id: 'semester-1', name: 'Fall 2026' },
        instructor: 'Dr. Smith',
      });

      const result = await service.create('user-1', { ...validDto, instructor: 'Dr. Smith' });

      expect(Object.keys(result).sort()).toEqual(COURSE_WITH_SEMESTER_KEYS);
      expect(result.semester).toEqual({ id: 'semester-1', name: 'Fall 2026' });
      expect(result.semesterId).toBe('semester-1');
      expect(result.instructor).toBe('Dr. Smith');
    });
  });
});
