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
 * SP-107B unit spec (mocked PrismaService, no database): pins the
 * `POST /courses` service semantics.
 *
 * - Creates with the principal's `userId`; optional fields pass through,
 *   omitted fields stay out of `data` (schema defaults apply).
 * - 400 cases: empty/over-long code or name, out-of-range credits,
 *   malformed color, over-long description — each with a field-level
 *   `errors` map.
 * - 409 on a duplicate code (P2002, mapped to the specific message).
 * - `semesterId` ownership: a `findFirst({ where: { id, userId } })` miss
 *   → uniform 404 (no course row written); a hit → the id is passed
 *   through; omitted → `semesterId: null`.
 */
describe('CoursesService (unit, mocked PrismaService)', () => {
  const findFirst = jest.fn();
  const create = jest.fn();

  // Partial mock: CoursesService only touches `prisma.semester` and
  // `prisma.course`.
  const prisma = {
    semester: { findFirst },
    course: { create },
  } as unknown as PrismaService;

  let service: CoursesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CoursesService(prisma);
  });

  const validDto = { code: 'CS101', name: 'Intro to Computer Science' };

  const createdRow = {
    id: 'course-1',
    userId: 'user-1',
    semesterId: null,
    code: 'CS101',
    name: 'Intro to Computer Science',
    description: null,
    color: '#6366f1',
    credits: null,
    isActive: true,
    createdAt: new Date('2026-10-18T12:00:00.000Z'),
    updatedAt: new Date('2026-10-18T12:00:00.000Z'),
  };

  describe('create', () => {
    it("creates the course with the principal's userId", async () => {
      findFirst.mockResolvedValue(null); // semesterId omitted → no lookup
      create.mockResolvedValue(createdRow);

      await service.create('user-1', validDto);

      expect(create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          code: 'CS101',
          name: 'Intro to Computer Science',
          semesterId: null,
        },
      });
      expect(findFirst).not.toHaveBeenCalled();
    });

    it('passes optional fields through when provided', async () => {
      findFirst.mockResolvedValue({ id: 'semester-1' });
      create.mockResolvedValue(createdRow);

      await service.create('user-1', {
        ...validDto,
        semesterId: 'semester-1',
        description: 'The first course',
        credits: 4,
        color: '#ff0000',
      });

      expect(create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          code: 'CS101',
          name: 'Intro to Computer Science',
          semesterId: 'semester-1',
          description: 'The first course',
          credits: 4,
          color: '#ff0000',
        },
      });
    });

    it('omits optional fields from the data when absent (schema defaults apply)', async () => {
      create.mockResolvedValue(createdRow);

      await service.create('user-1', validDto);

      const data = create.mock.calls[0][0].data as Record<string, unknown>;
      expect(data).not.toHaveProperty('description');
      expect(data).not.toHaveProperty('credits');
      expect(data).not.toHaveProperty('color');
      expect(data).not.toHaveProperty('isActive');
    });

    it('serializes the created row to the frontend Course type shape', async () => {
      create.mockResolvedValue(createdRow);

      const result = await service.create('user-1', validDto);

      expect(result).toEqual({
        id: 'course-1',
        code: 'CS101',
        name: 'Intro to Computer Science',
        description: null,
        color: '#6366f1',
        credits: null,
        isActive: true,
        createdAt: '2026-10-18T12:00:00.000Z',
        updatedAt: '2026-10-18T12:00:00.000Z',
      });
    });

    it('trims code and name before storing them', async () => {
      create.mockResolvedValue(createdRow);

      await service.create('user-1', { code: '  CS101  ', name: '  Intro  ' });

      const data = create.mock.calls[0][0].data as Record<string, unknown>;
      expect(data.code).toBe('CS101');
      expect(data.name).toBe('Intro');
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
      expect(create).not.toHaveBeenCalled();
      expect(findFirst).not.toHaveBeenCalled();
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
        expect(create).not.toHaveBeenCalled();
      }
    });

    it('an over-long description (2001 chars) → errors.description', async () => {
      await expect400With({ description: 'x'.repeat(2001) }, 'description');
    });

    it('accepts boundary values (credits 30, 6-hex color, 2000-char description)', async () => {
      create.mockResolvedValue(createdRow);

      await service.create('user-1', {
        ...validDto,
        credits: 30,
        color: '#abcdef',
        description: 'x'.repeat(2000),
      });

      expect(create).toHaveBeenCalledTimes(1);
    });
  });

  describe('409 duplicate code', () => {
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
      expect((error as ConflictException).message).toBe('A course with this code already exists.');
    });

    it('rethrows unrelated errors (the global filter remains the fallback)', async () => {
      const unexpected = new Error('boom');
      create.mockRejectedValue(unexpected);

      await expect(service.create('user-1', validDto)).rejects.toBe(unexpected);
    });
  });

  describe('semesterId ownership', () => {
    it('a missing semester (findFirst miss) → uniform 404, no course row written', async () => {
      findFirst.mockResolvedValue(null);

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
      expect(findFirst).toHaveBeenCalledWith({
        where: { id: 'someone-elses-semester', userId: 'user-1' },
        select: { id: true },
      });
      // …and nothing is written on a miss.
      expect(create).not.toHaveBeenCalled();
    });

    it('an owned semester (findFirst hit) → the id is passed through', async () => {
      findFirst.mockResolvedValue({ id: 'semester-1' });
      create.mockResolvedValue(createdRow);

      await service.create('user-1', { ...validDto, semesterId: 'semester-1' });

      const data = create.mock.calls[0][0].data as Record<string, unknown>;
      expect(data.semesterId).toBe('semester-1');
    });

    it('an omitted semesterId → null without a lookup', async () => {
      create.mockResolvedValue(createdRow);

      await service.create('user-1', validDto);

      expect(findFirst).not.toHaveBeenCalled();
      const data = create.mock.calls[0][0].data as Record<string, unknown>;
      expect(data.semesterId).toBeNull();
    });

    it('an explicit null semesterId → null without a lookup', async () => {
      create.mockResolvedValue(createdRow);

      await service.create('user-1', { ...validDto, semesterId: null });

      expect(findFirst).not.toHaveBeenCalled();
      const data = create.mock.calls[0][0].data as Record<string, unknown>;
      expect(data.semesterId).toBeNull();
    });
  });
});
