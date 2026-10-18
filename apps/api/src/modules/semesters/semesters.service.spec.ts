import { BadRequestException, ConflictException, HttpStatus } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SemestersService } from './semesters.service';

/**
 * SP-107B unit spec (mocked PrismaService, no database): pins the
 * `POST /semesters` service semantics.
 *
 * - Creates with the principal's `userId`; `isActive` is left to the schema
 *   default (never in `data`); dates are parsed to UTC-midnight `Date`s and
 *   serialized back as `yyyy-MM-dd` (D107-7).
 * - 400 cases: empty/over-long name, malformed or impossible date strings,
 *   `end == start`, `end < start` — each with a field-level `errors` map.
 * - 409 on a P2002 from the create (mapped to the specific message).
 * - Unrelated errors propagate (the global filter's generic 409 remains the
 *   fallback for any other unique path).
 */
describe('SemestersService (unit, mocked PrismaService)', () => {
  const create = jest.fn();

  // Partial mock: SemestersService only touches `prisma.semester`.
  const prisma = { semester: { create } } as unknown as PrismaService;

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
});
