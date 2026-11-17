import { BadRequestException, HttpStatus, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RESOURCE_NOT_FOUND } from '../../common/ownership/ownership';
import { ScheduleService } from './schedule.service';
import { CreateScheduleBlockDto } from './dto/create-schedule-block.dto';
import { UpdateScheduleBlockDto } from './dto/update-schedule-block.dto';
import { PutDayBoundsDto } from './dto/put-day-bounds.dto';

/**
 * EP15B unit spec (mocked PrismaService, no database): the service's
 * branch logic — what is validated before any write, which branch a PATCH
 * or DELETE takes (in place / split / trim / delete / no-op), what each
 * branch writes, and the `ScheduleBlock` projection. The gated siblings
 * (`schedule-e2e.spec.ts`, `schedule-data-scoping.spec.ts`) prove the same
 * rules over HTTP against a real database.
 */
describe('ScheduleService (unit, mocked PrismaService)', () => {
  const block = {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  };
  const exception = { updateMany: jest.fn(), deleteMany: jest.fn(), upsert: jest.fn() };
  const dayBounds = { findMany: jest.fn(), upsert: jest.fn() };
  const course = { findFirst: jest.fn() };
  const $transaction = jest.fn();

  const tx = { scheduleBlock: block, scheduleBlockException: exception };
  const prisma = {
    scheduleBlock: block,
    scheduleBlockException: exception,
    dayBounds,
    course,
    $transaction,
  } as unknown as PrismaService;

  let service: ScheduleService;
  const userId = 'user-1';

  const row = (overrides: Record<string, unknown> = {}) => ({
    id: 'block-1',
    userId,
    kind: 'STUDY' as const,
    title: 'Focus',
    courseId: 'course-1',
    energy: 'HIGH' as const,
    startDate: new Date('2026-11-16T00:00:00.000Z'),
    endDate: null as Date | null,
    weekdays: (1 << 1) | (1 << 3) | (1 << 5),
    startTime: '09:00',
    endTime: '10:30',
    createdAt: new Date('2026-11-01T12:00:00.000Z'),
    updatedAt: new Date('2026-11-01T12:00:00.000Z'),
    ...overrides,
  });

  const createDto = (overrides: Record<string, unknown> = {}): CreateScheduleBlockDto =>
    Object.assign(new CreateScheduleBlockDto(), {
      kind: 'STUDY',
      startDate: '2026-11-16',
      weekdays: [1, 3, 5],
      startTime: '09:00',
      endTime: '10:30',
      ...overrides,
    });

  const updateDto = (fields: Record<string, unknown>): UpdateScheduleBlockDto =>
    Object.assign(new UpdateScheduleBlockDto(), fields);

  const errorsOf = async (promise: Promise<unknown>): Promise<Record<string, string[]>> => {
    try {
      await promise;
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const body = (error as BadRequestException).getResponse() as {
        statusCode: number;
        errors: Record<string, string[]>;
      };
      expect(body.statusCode).toBe(HttpStatus.BAD_REQUEST);
      return body.errors;
    }
    throw new Error('expected a BadRequestException');
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ScheduleService(prisma);
    // Interactive form: run the callback against the same mocks. Array form: resolve.
    $transaction.mockImplementation(async (arg: unknown) =>
      typeof arg === 'function'
        ? (arg as (t: unknown) => Promise<unknown>)(tx)
        : Promise.all(arg as Promise<unknown>[])
    );
    block.updateMany.mockResolvedValue({ count: 1 });
    block.deleteMany.mockResolvedValue({ count: 1 });
    exception.updateMany.mockResolvedValue({ count: 0 });
    exception.deleteMany.mockResolvedValue({ count: 0 });
    course.findFirst.mockResolvedValue({ id: 'course-1' });
  });

  describe('projection', () => {
    it('lists with the 12 contract keys, weekdays as an ascending array, never userId', async () => {
      block.findMany.mockResolvedValue([row()]);
      const [out] = await service.listBlocks(userId);
      expect(Object.keys(out).sort()).toEqual(
        [
          'courseId',
          'createdAt',
          'endDate',
          'endTime',
          'energy',
          'id',
          'kind',
          'startDate',
          'startTime',
          'title',
          'updatedAt',
          'weekdays',
        ].sort()
      );
      expect(out).toMatchObject({ startDate: '2026-11-16', endDate: null, weekdays: [1, 3, 5] });
      expect(block.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId },
          orderBy: [{ startDate: 'asc' }, { startTime: 'asc' }, { id: 'asc' }],
        })
      );
    });
  });

  describe('day bounds', () => {
    it('GET fills defaults and reports configured from the stored rows', async () => {
      dayBounds.findMany.mockResolvedValue([
        { dayOfWeek: 1, wakeTime: '07:00', sleepTime: '22:00' },
      ]);
      const out = await service.getDayBounds(userId);
      expect(out.configured).toBe(false);
      expect(out.days[1]).toEqual({ dayOfWeek: 1, wakeTime: '07:00', sleepTime: '22:00' });
      expect(out.days[2]).toEqual({ dayOfWeek: 2, wakeTime: '08:00', sleepTime: '23:00' });
      expect(dayBounds.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId } })
      );
    });

    it('PUT validates every entry before any write (no transaction on failure)', async () => {
      const days = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
        dayOfWeek,
        wakeTime: '07:00',
        sleepTime: '22:00',
      }));
      days[2] = { dayOfWeek: 2, wakeTime: '23:00', sleepTime: '22:00' };
      const errors = await errorsOf(
        service.putDayBounds(userId, Object.assign(new PutDayBoundsDto(), { days }))
      );
      expect(errors['days[2].sleepTime']).toEqual([
        'days[2].sleepTime must be strictly after days[2].wakeTime',
      ]);
      expect($transaction).not.toHaveBeenCalled();
      expect(dayBounds.upsert).not.toHaveBeenCalled();
    });

    it('PUT with a non-object entry and a missing weekday → field-level errors', async () => {
      const days: unknown[] = [0, 1, 2, 3, 4, 5].map((dayOfWeek) => ({
        dayOfWeek,
        wakeTime: '07:00',
        sleepTime: '22:00',
      }));
      days.push('monday');
      const errors = await errorsOf(
        service.putDayBounds(userId, Object.assign(new PutDayBoundsDto(), { days }))
      );
      expect(errors['days[6]']).toBeDefined();
      expect($transaction).not.toHaveBeenCalled();
    });

    it('PUT upserts all seven in one $transaction batch, then re-reads', async () => {
      const days = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
        dayOfWeek,
        wakeTime: '07:00',
        sleepTime: '24:00',
      }));
      dayBounds.upsert.mockImplementation((args: unknown) => Promise.resolve(args));
      dayBounds.findMany.mockResolvedValue(days);
      const out = await service.putDayBounds(
        userId,
        Object.assign(new PutDayBoundsDto(), { days })
      );
      expect($transaction).toHaveBeenCalledTimes(1);
      expect(dayBounds.upsert).toHaveBeenCalledTimes(7);
      expect(dayBounds.upsert).toHaveBeenCalledWith({
        where: { userId_dayOfWeek: { userId, dayOfWeek: 3 } },
        create: { userId, dayOfWeek: 3, wakeTime: '07:00', sleepTime: '24:00' },
        update: { wakeTime: '07:00', sleepTime: '24:00' },
      });
      expect(out).toEqual({ configured: true, days });
    });
  });

  describe('createBlock', () => {
    it.each([
      [
        'courseId on BUSY',
        { kind: 'BUSY', weekdays: null, courseId: 'course-1' },
        'courseId',
        'courseId applies to study blocks only',
      ],
      [
        'energy on BUSY',
        { kind: 'BUSY', weekdays: null, energy: 'LOW' },
        'energy',
        'energy applies to study blocks only',
      ],
      [
        'endDate without weekdays',
        { weekdays: null, endDate: '2026-12-01' },
        'endDate',
        'endDate applies to weekly blocks only (set weekdays or omit endDate)',
      ],
      [
        'endDate before startDate',
        { endDate: '2026-11-15' },
        'endDate',
        'endDate must be on or after startDate',
      ],
      [
        'endTime == startTime',
        { endTime: '09:00' },
        'endTime',
        'endTime must be strictly after startTime',
      ],
      [
        'startTime 24:00',
        { startTime: '24:00', endTime: '24:00' },
        'startTime',
        'startTime must be before 24:00',
      ],
      [
        'title > 60 after trim',
        { title: ` ${'x'.repeat(61)} ` },
        'title',
        'title must be 60 characters or fewer',
      ],
      ['weekdays duplicate', { weekdays: [1, 1] }, 'weekdays', undefined],
      ['unknown field', { userId: 'x' }, 'userId', undefined],
    ])('%s → 400 on %s, nothing written', async (_label, overrides, field, message) => {
      const errors = await errorsOf(service.createBlock(userId, createDto(overrides)));
      expect(errors[field]).toBeDefined();
      if (message) expect(errors[field]).toEqual([message]);
      expect(block.create).not.toHaveBeenCalled();
    });

    it('a course the student does not own → uniform 404, nothing written', async () => {
      course.findFirst.mockResolvedValue(null);
      await expect(
        service.createBlock(userId, createDto({ courseId: 'course-9' }))
      ).rejects.toThrow(new NotFoundException(RESOURCE_NOT_FOUND));
      expect(course.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'course-9', userId } })
      );
      expect(block.create).not.toHaveBeenCalled();
    });

    it('writes the normalized values: trimmed title, bitmask weekdays, UTC-midnight dates, energy default', async () => {
      block.create.mockResolvedValue(row({ title: 'Deep work', energy: 'NORMAL' }));
      await service.createBlock(
        userId,
        createDto({
          title: '  Deep work ',
          courseId: 'course-1',
          endDate: '2026-12-31',
          weekdays: [5, 1, 3],
        })
      );
      expect(block.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            userId,
            kind: 'STUDY',
            title: 'Deep work',
            courseId: 'course-1',
            energy: 'NORMAL',
            startDate: new Date('2026-11-16T00:00:00.000Z'),
            endDate: new Date('2026-12-31T00:00:00.000Z'),
            weekdays: (1 << 1) | (1 << 3) | (1 << 5),
            startTime: '09:00',
            endTime: '10:30',
          },
        })
      );
    });
  });

  describe('updateBlock', () => {
    it('a scoped miss → uniform 404 before any validation of the body', async () => {
      block.findFirst.mockResolvedValue(null);
      await expect(service.updateBlock(userId, 'nope', updateDto({ title: 'x' }))).rejects.toThrow(
        new NotFoundException(RESOURCE_NOT_FOUND)
      );
      expect(block.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'nope', userId } })
      );
      expect(block.update).not.toHaveBeenCalled();
    });

    it('empty body (or only null on a non-nullable field) → 400', async () => {
      block.findFirst.mockResolvedValue(row());
      await expect(service.updateBlock(userId, 'block-1', updateDto({}))).rejects.toThrow(
        'At least one field must be provided'
      );
      await expect(
        service.updateBlock(userId, 'block-1', updateDto({ energy: null }))
      ).rejects.toThrow('At least one field must be provided');
    });

    it('kind in the body → 400 with the immutability message', async () => {
      const errors = await errorsOf(
        service.updateBlock(userId, 'block-1', updateDto({ kind: 'BUSY' }))
      );
      expect(errors.kind[0]).toMatch(/cannot be changed/);
      expect(block.findFirst).not.toHaveBeenCalled();
    });

    it('validates merged values: a patched endTime equal to the stored startTime → 400', async () => {
      block.findFirst.mockResolvedValue(row());
      const errors = await errorsOf(
        service.updateBlock(userId, 'block-1', updateDto({ endTime: '09:00' }))
      );
      expect(errors.endTime).toBeDefined();
      expect(block.update).not.toHaveBeenCalled();
    });

    it('in place: no effectiveFrom → update({ id, userId }) with the merged values', async () => {
      block.findFirst.mockResolvedValue(row());
      block.update.mockResolvedValue(row({ title: null }));
      const out = await service.updateBlock(userId, 'block-1', updateDto({ title: null }));
      expect(block.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'block-1', userId },
          data: expect.objectContaining({ title: null, weekdays: (1 << 1) | (1 << 3) | (1 << 5) }),
        })
      );
      expect($transaction).not.toHaveBeenCalled();
      expect(out.title).toBeNull();
    });

    it('in place: effectiveFrom ≤ startDate updates the same row', async () => {
      block.findFirst.mockResolvedValue(row());
      block.update.mockResolvedValue(row({ startTime: '08:00' }));
      await service.updateBlock(
        userId,
        'block-1',
        updateDto({ effectiveFrom: '2026-11-16', startTime: '08:00' })
      );
      expect(block.update).toHaveBeenCalledTimes(1);
      expect($transaction).not.toHaveBeenCalled();
    });

    it('effectiveFrom on a one-off → 400; after endDate → 400; weekdays: null without it → 400', async () => {
      block.findFirst.mockResolvedValue(row({ weekdays: null }));
      let errors = await errorsOf(
        service.updateBlock(userId, 'block-1', updateDto({ effectiveFrom: '2026-11-20' }))
      );
      expect(errors.effectiveFrom).toEqual(['effectiveFrom applies to weekly blocks only']);

      block.findFirst.mockResolvedValue(row({ endDate: new Date('2026-11-30T00:00:00.000Z') }));
      errors = await errorsOf(
        service.updateBlock(
          userId,
          'block-1',
          updateDto({ effectiveFrom: '2026-12-01', title: 'x' })
        )
      );
      expect(errors.effectiveFrom).toBeDefined();

      block.findFirst.mockResolvedValue(row());
      errors = await errorsOf(
        service.updateBlock(userId, 'block-1', updateDto({ weekdays: null, endDate: null }))
      );
      expect(errors.effectiveFrom).toBeDefined();
      expect(block.update).not.toHaveBeenCalled();
      expect($transaction).not.toHaveBeenCalled();
    });

    it('split: ends the original the day before, creates the successor, moves exceptions ≥ effectiveFrom, returns the successor', async () => {
      block.findFirst.mockResolvedValue(row());
      const successor = row({
        id: 'block-2',
        startDate: new Date('2026-11-23T00:00:00.000Z'),
        weekdays: 1 << 2,
      });
      block.create.mockResolvedValue(successor);
      const out = await service.updateBlock(
        userId,
        'block-1',
        updateDto({ effectiveFrom: '2026-11-23', weekdays: [2] })
      );
      expect($transaction).toHaveBeenCalledTimes(1);
      expect(block.updateMany).toHaveBeenCalledWith({
        where: { id: 'block-1', userId },
        data: { endDate: new Date('2026-11-22T00:00:00.000Z') },
      });
      expect(block.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId,
            kind: 'STUDY',
            courseId: 'course-1',
            energy: 'HIGH',
            startDate: new Date('2026-11-23T00:00:00.000Z'),
            endDate: null,
            weekdays: 1 << 2,
          }),
        })
      );
      expect(exception.updateMany).toHaveBeenCalledWith({
        where: { blockId: 'block-1', date: { gte: new Date('2026-11-23T00:00:00.000Z') } },
        data: { blockId: 'block-2' },
      });
      expect(block.update).not.toHaveBeenCalled();
      expect(out.id).toBe('block-2');
    });

    it('split to a one-off drops exceptions ≥ effectiveFrom instead of moving them', async () => {
      block.findFirst.mockResolvedValue(row());
      block.create.mockResolvedValue(row({ id: 'block-2', weekdays: null }));
      await service.updateBlock(
        userId,
        'block-1',
        updateDto({ effectiveFrom: '2026-11-23', weekdays: null, endDate: null })
      );
      expect(exception.deleteMany).toHaveBeenCalledWith({
        where: { blockId: 'block-1', date: { gte: new Date('2026-11-23T00:00:00.000Z') } },
      });
      expect(exception.updateMany).not.toHaveBeenCalled();
    });

    it('split: the original vanishing between read and write → uniform 404', async () => {
      block.findFirst.mockResolvedValue(row());
      block.updateMany.mockResolvedValue({ count: 0 });
      await expect(
        service.updateBlock(
          userId,
          'block-1',
          updateDto({ effectiveFrom: '2026-11-23', title: 'x' })
        )
      ).rejects.toThrow(new NotFoundException(RESOURCE_NOT_FOUND));
      expect(block.create).not.toHaveBeenCalled();
    });
  });

  describe('deleteBlock', () => {
    it('malformed from → 400 before any lookup', async () => {
      const errors = await errorsOf(service.deleteBlock(userId, 'block-1', '2026-13-01'));
      expect(errors.from).toBeDefined();
      expect(block.findFirst).not.toHaveBeenCalled();
    });

    it('scoped miss → uniform 404', async () => {
      block.findFirst.mockResolvedValue(null);
      await expect(service.deleteBlock(userId, 'block-1')).rejects.toThrow(
        new NotFoundException(RESOURCE_NOT_FOUND)
      );
    });

    it.each([
      ['no from', undefined, row()],
      ['a one-off', '2026-11-20', row({ weekdays: null })],
      ['from ≤ startDate', '2026-11-16', row()],
    ])('%s → deleteMany({ id, userId })', async (_label, from, existing) => {
      block.findFirst.mockResolvedValue(existing);
      await service.deleteBlock(userId, 'block-1', from);
      expect(block.deleteMany).toHaveBeenCalledWith({ where: { id: 'block-1', userId } });
      expect($transaction).not.toHaveBeenCalled();
    });

    it('from after endDate → no-op (nothing written)', async () => {
      block.findFirst.mockResolvedValue(row({ endDate: new Date('2026-11-30T00:00:00.000Z') }));
      await service.deleteBlock(userId, 'block-1', '2026-12-01');
      expect(block.deleteMany).not.toHaveBeenCalled();
      expect(block.updateMany).not.toHaveBeenCalled();
      expect($transaction).not.toHaveBeenCalled();
    });

    it('from mid-series → one transaction: endDate := from − 1 and exceptions ≥ from removed', async () => {
      block.findFirst.mockResolvedValue(row());
      await service.deleteBlock(userId, 'block-1', '2026-12-01');
      expect($transaction).toHaveBeenCalledTimes(1);
      expect(block.updateMany).toHaveBeenCalledWith({
        where: { id: 'block-1', userId },
        data: { endDate: new Date('2026-11-30T00:00:00.000Z') },
      });
      expect(exception.deleteMany).toHaveBeenCalledWith({
        where: { blockId: 'block-1', date: { gte: new Date('2026-12-01T00:00:00.000Z') } },
      });
      expect(block.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('cancelOccurrence', () => {
    it('malformed date → 400 before any lookup; scoped miss → uniform 404', async () => {
      const errors = await errorsOf(service.cancelOccurrence(userId, 'block-1', '2026-13-01'));
      expect(errors.date).toBeDefined();
      expect(block.findFirst).not.toHaveBeenCalled();
      block.findFirst.mockResolvedValue(null);
      await expect(service.cancelOccurrence(userId, 'block-1', '2026-11-18')).rejects.toThrow(
        new NotFoundException(RESOURCE_NOT_FOUND)
      );
    });

    it('weekly: an occurrence date upserts the exception (idempotent); a non-occurrence → 400', async () => {
      block.findFirst.mockResolvedValue(row());
      await service.cancelOccurrence(userId, 'block-1', '2026-11-18'); // a Wednesday
      expect(exception.upsert).toHaveBeenCalledWith({
        where: { blockId_date: { blockId: 'block-1', date: new Date('2026-11-18T00:00:00.000Z') } },
        create: { blockId: 'block-1', date: new Date('2026-11-18T00:00:00.000Z') },
        update: {},
      });
      const errors = await errorsOf(service.cancelOccurrence(userId, 'block-1', '2026-11-17')); // a Tuesday
      expect(errors.date).toEqual(['date is not an occurrence of this block']);
      const before = await errorsOf(service.cancelOccurrence(userId, 'block-1', '2026-11-13')); // before startDate
      expect(before.date).toBeDefined();
      expect(exception.upsert).toHaveBeenCalledTimes(1);
    });

    it('one-off: the matching date deletes the row; another date → 400', async () => {
      block.findFirst.mockResolvedValue(row({ weekdays: null }));
      await service.cancelOccurrence(userId, 'block-1', '2026-11-16');
      expect(block.deleteMany).toHaveBeenCalledWith({ where: { id: 'block-1', userId } });
      const errors = await errorsOf(service.cancelOccurrence(userId, 'block-1', '2026-11-17'));
      expect(errors.date).toEqual(['date is not an occurrence of this block']);
      expect(block.deleteMany).toHaveBeenCalledTimes(1);
    });
  });
});
