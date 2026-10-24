import { v4 as uuid } from 'uuid';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FieldValidationPipe } from '../../common/pipes/validation.pipe';
import { PrismaService } from '../prisma/prisma.service';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';

const invalid: [string, unknown][] = [
  ['title', undefined],
  ['title', null],
  ['title', 42],
  ['title', '   '],
  ['title', 'x'.repeat(201)],
  ['dueDate', 'yesterday'],
  ['dueDate', '2026-02-30T12:00:00Z'],
  ['dueDate', '2026-10-24'],
  ['dueDate', '2026-W01-1T12:00:00Z'],
  ['dueDate', '2026-01-01T23:59:60Z'],
  ['estimatedHours', 0],
  ['estimatedHours', -3],
  ['estimatedHours', 100000],
  ['estimatedHours', 'abc'],
  ['estimatedHours', '2'],
  ['estimatedHours', NaN],
  ['estimatedHours', Infinity],
  ['priority', 'SUPER'],
  ['description', 'x'.repeat(2001)],
  ['description', 42],
];

describe('AssignmentsService (SP-113A)', () => {
  const now = new Date('2026-10-24T12:00:00Z');
  let service: AssignmentsService;
  let prisma: { course: { findFirst: jest.Mock }; assignment: { create: jest.Mock } };

  beforeEach(() => {
    prisma = {
      course: { findFirst: jest.fn().mockResolvedValue({ id: 'own-course' }) },
      assignment: {
        create: jest.fn().mockImplementation(async ({ data }) => ({
          id: 'assignment',
          description: null,
          dueDate: null,
          estimatedHours: null,
          actualHours: null,
          status: 'PENDING',
          priority: 'MEDIUM',
          createdAt: now,
          updatedAt: now,
          ...data,
        })),
      },
    };
    service = new AssignmentsService(prisma as unknown as PrismaService);
  });

  it('returns exactly the 10-key projection and leaves defaults to Prisma', async () => {
    expect(await service.create('student', { title: '  Essay  ' })).toEqual({
      id: 'assignment',
      title: 'Essay',
      description: null,
      dueDate: null,
      estimatedHours: null,
      actualHours: null,
      status: 'PENDING',
      priority: 'MEDIUM',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
    expect(prisma.assignment.create).toHaveBeenCalledWith({
      data: { userId: 'student', title: 'Essay', courseId: null },
    });
    expect(prisma.course.findFirst).not.toHaveBeenCalled();
  });

  it('accepts all fields, past deadlines and upper bounds; scopes the course gate', async () => {
    const dto: CreateAssignmentDto = {
      title: 'x'.repeat(200),
      courseId: 'own-course',
      dueDate: '2020-01-01T12:00:00Z',
      estimatedHours: 1000,
      priority: 'URGENT',
      description: 'x'.repeat(2000),
    };
    const result = await service.create('student', dto);
    expect(prisma.course.findFirst).toHaveBeenCalledWith({
      where: { id: 'own-course', userId: 'student' },
      select: { id: true },
    });
    expect(result).toMatchObject({
      title: dto.title,
      estimatedHours: 1000,
      priority: 'URGENT',
      description: dto.description,
      dueDate: '2020-01-01T12:00:00.000Z',
    });
    expect(result).not.toHaveProperty('courseId');
  });

  it('normalizes optional nulls, including courseId', async () => {
    await service.create('student', {
      title: 'Essay',
      courseId: null,
      dueDate: null,
      estimatedHours: null,
      priority: null,
      description: null,
    });
    expect(prisma.course.findFirst).not.toHaveBeenCalled();
    expect(prisma.assignment.create).toHaveBeenCalledWith({
      data: { userId: 'student', title: 'Essay', courseId: null },
    });
  });

  it.each(['foreign', 'missing', ''])('course %p → uniform 404 and no write', async (courseId) => {
    prisma.course.findFirst.mockResolvedValue(null);
    await expect(service.create('student', { title: 'Essay', courseId })).rejects.toEqual(
      new NotFoundException('Resource not found')
    );
    expect(prisma.assignment.create).not.toHaveBeenCalled();
  });

  it.each(invalid)(
    'rechecks invalid %s=%p with field errors and no write',
    async (field, value) => {
      try {
        await service.create('student', { title: 'Essay', [field]: value } as CreateAssignmentDto);
        throw new Error('expected validation error');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect((error as BadRequestException).getResponse()).toMatchObject({
          errors: { [field]: expect.any(Array) },
        });
      }
      expect(prisma.assignment.create).not.toHaveBeenCalled();
      expect(prisma.course.findFirst).not.toHaveBeenCalled();
    }
  );
});

describe('CreateAssignmentDto with production FieldValidationPipe', () => {
  const pipe = new FieldValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  });
  const validate = (body: Record<string, unknown>) =>
    pipe.transform(body, {
      type: 'body',
      metatype: CreateAssignmentDto,
    });

  it.each([...invalid, ['status', 'COMPLETED'], ['type', 'EXAM'], ['userId', 'other']])(
    'rejects %s=%p at pipe level',
    async (field, value) => {
      await expect(validate({ title: 'Essay', [field]: value })).rejects.toMatchObject({
        response: { errors: { [field]: expect.any(Array) } },
      });
    }
  );
  it('accepts a valid full DTO and explicit optional nulls', async () => {
    await expect(
      validate({
        title: 'Essay',
        courseId: null,
        dueDate: null,
        estimatedHours: 0.25,
        priority: 'LOW',
        description: '',
      })
    ).resolves.toBeInstanceOf(CreateAssignmentDto);
  });
});

describe('AssignmentsService update/delete (SP-114D)', () => {
  const now = new Date('2026-10-24T12:00:00Z');
  const later = new Date('2026-10-24T13:00:00Z');
  // The stored row every update/delete test starts from.
  const stored = {
    id: 'assignment',
    userId: 'student',
    courseId: 'own-course',
    title: 'Essay',
    description: 'Outline',
    dueDate: new Date('2026-11-15T23:59:00.000Z'),
    estimatedHours: 2.5,
    actualHours: null,
    status: 'PENDING',
    priority: 'HIGH',
    createdAt: now,
    updatedAt: now,
  };
  let service: AssignmentsService;
  let prisma: {
    assignment: { findFirst: jest.Mock; update: jest.Mock; delete: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      assignment: {
        // The ownership predicate is in the query: a miss (missing or
        // another student's id) resolves to null.
        findFirst: jest
          .fn()
          .mockImplementation(async ({ where }) =>
            where.userId === 'student' && where.id === 'assignment' ? stored : null
          ),
        update: jest.fn().mockImplementation(async ({ data }) => ({
          ...stored,
          ...data,
          updatedAt: later,
        })),
        delete: jest.fn().mockResolvedValue({}),
      },
    };
    service = new AssignmentsService(prisma as unknown as PrismaService);
  });

  it('updates only the provided fields, preserves the rest, returns the 10-key projection', async () => {
    const result = await service.update('student', 'assignment', { title: '  New title  ' });
    expect(prisma.assignment.findFirst).toHaveBeenCalledWith({
      where: { id: 'assignment', userId: 'student' },
    });
    expect(prisma.assignment.update).toHaveBeenCalledWith({
      where: { id: 'assignment', userId: 'student' },
      data: { title: 'New title' },
    });
    expect(result).toEqual({
      id: 'assignment',
      title: 'New title',
      description: 'Outline',
      dueDate: '2026-11-15T23:59:00.000Z',
      estimatedHours: 2.5,
      actualHours: null,
      status: 'PENDING',
      priority: 'HIGH',
      createdAt: now.toISOString(),
      updatedAt: later.toISOString(),
    });
  });

  it.each([
    ['title', 42],
    ['title', '   '],
    ['title', 'x'.repeat(201)],
    ['dueDate', 'yesterday'],
    ['dueDate', '2026-02-30T12:00:00Z'],
    ['dueDate', '2026-10-24'],
    ['dueDate', '2026-W01-1T12:00:00Z'],
    ['dueDate', '2026-01-01T23:59:60Z'],
    ['estimatedHours', 0],
    ['estimatedHours', -3],
    ['estimatedHours', 100000],
    ['estimatedHours', 'abc'],
    ['estimatedHours', '2'],
    ['estimatedHours', NaN],
    ['estimatedHours', Infinity],
    ['priority', 'SUPER'],
    ['description', 'x'.repeat(2001)],
    ['description', 42],
  ])('rechecks invalid %s=%p with field errors and no query or write', async (field, value) => {
    try {
      await service.update('student', 'assignment', { [field]: value } as UpdateAssignmentDto);
      throw new Error('expected validation error');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toMatchObject({
        errors: { [field]: expect.any(Array) },
      });
    }
    expect(prisma.assignment.findFirst).not.toHaveBeenCalled();
    expect(prisma.assignment.update).not.toHaveBeenCalled();
  });

  it.each([
    ['status', 'COMPLETED'],
    ['actualHours', 5],
    ['courseId', 'own-course'],
    ['userId', 'other'],
  ])('rejects unknown %s=%p with a field-level 400 and no query or write', async (field, value) => {
    try {
      await service.update('student', 'assignment', { [field]: value } as UpdateAssignmentDto);
      throw new Error('expected validation error');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toMatchObject({
        errors: { [field]: expect.any(Array) },
      });
    }
    expect(prisma.assignment.findFirst).not.toHaveBeenCalled();
    expect(prisma.assignment.update).not.toHaveBeenCalled();
  });

  it('treats explicit nulls as omitted and keeps the stored values (D114-5)', async () => {
    await service.update('student', 'assignment', {
      title: 'Kept',
      description: null,
      dueDate: null,
      estimatedHours: null,
      priority: null,
    });
    expect(prisma.assignment.update).toHaveBeenCalledWith({
      where: { id: 'assignment', userId: 'student' },
      data: { title: 'Kept' },
    });
  });

  it("clears the stored description when patched with '' (D114-5)", async () => {
    await service.update('student', 'assignment', { description: '' });
    expect(prisma.assignment.update).toHaveBeenCalledWith({
      where: { id: 'assignment', userId: 'student' },
      data: { description: '' },
    });
  });

  it.each([
    ['empty', {}],
    [
      'all-null',
      { title: null, description: null, dueDate: null, estimatedHours: null, priority: null },
    ],
  ])('PATCH %s body → 400 at-least-one without a write', async (_label, body) => {
    await expect(
      service.update('student', 'assignment', body as UpdateAssignmentDto)
    ).rejects.toEqual(new BadRequestException('At least one field must be provided'));
    expect(prisma.assignment.update).not.toHaveBeenCalled();
  });

  it.each([
    ['missing id', 'student', uuid()],
    ['foreign owner', 'other-student', 'assignment'],
    ['malformed id', 'student', 'not-an-id'],
    ['empty id', 'student', ''],
  ])('PATCH %s → uniform 404 and no write', async (_label, userId, id) => {
    await expect(service.update(userId, id, { title: 'New' })).rejects.toEqual(
      new NotFoundException('Resource not found')
    );
    expect(prisma.assignment.update).not.toHaveBeenCalled();
  });

  it('deletes the own assignment with the scoped predicate and returns nothing', async () => {
    const result = await service.delete('student', 'assignment');
    expect(result).toBeUndefined();
    expect(prisma.assignment.findFirst).toHaveBeenCalledWith({
      where: { id: 'assignment', userId: 'student' },
    });
    expect(prisma.assignment.delete).toHaveBeenCalledWith({
      where: { id: 'assignment', userId: 'student' },
    });
  });

  it.each([
    ['missing id', 'student', uuid()],
    ['foreign owner', 'other-student', 'assignment'],
    ['malformed id', 'student', 'not-an-id'],
    ['empty id', 'student', ''],
  ])('DELETE %s → uniform 404 and no delete', async (_label, userId, id) => {
    await expect(service.delete(userId, id)).rejects.toEqual(
      new NotFoundException('Resource not found')
    );
    expect(prisma.assignment.delete).not.toHaveBeenCalled();
  });
});

describe('UpdateAssignmentDto with production FieldValidationPipe', () => {
  const pipe = new FieldValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  });
  const validate = (body: Record<string, unknown>) =>
    pipe.transform(body, {
      type: 'body',
      metatype: UpdateAssignmentDto,
    });

  it.each([
    ['title', 42],
    ['title', '   '],
    ['title', 'x'.repeat(201)],
    ['dueDate', 'yesterday'],
    ['dueDate', '2026-02-30T12:00:00Z'],
    ['dueDate', '2026-10-24'],
    ['dueDate', '2026-W01-1T12:00:00Z'],
    ['dueDate', '2026-01-01T23:59:60Z'],
    ['estimatedHours', 0],
    ['estimatedHours', -3],
    ['estimatedHours', 100000],
    ['estimatedHours', 'abc'],
    ['estimatedHours', '2'],
    ['priority', 'SUPER'],
    ['description', 'x'.repeat(2001)],
    ['description', 42],
    ['status', 'COMPLETED'],
    ['actualHours', 5],
    ['courseId', 'own-course'],
    ['userId', 'other'],
  ])('rejects %s=%p at pipe level', async (field, value) => {
    await expect(validate({ title: 'Essay', [field]: value })).rejects.toMatchObject({
      response: { errors: { [field]: expect.any(Array) } },
    });
  });

  it('accepts a valid partial DTO and explicit optional nulls', async () => {
    await expect(
      validate({
        title: null,
        description: '',
        dueDate: null,
        estimatedHours: 1,
        priority: 'LOW',
      })
    ).resolves.toBeInstanceOf(UpdateAssignmentDto);
  });

  it('accepts an empty body at pipe level (the service enforces at-least-one)', async () => {
    await expect(validate({})).resolves.toBeInstanceOf(UpdateAssignmentDto);
  });
});
