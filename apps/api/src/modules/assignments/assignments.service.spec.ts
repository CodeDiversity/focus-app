import { v4 as uuid } from 'uuid';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FieldValidationPipe } from '../../common/pipes/validation.pipe';
import { PrismaService } from '../prisma/prisma.service';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { CreateSubtaskDto } from './dto/create-subtask.dto';
import { UpdateSubtaskDto } from './dto/update-subtask.dto';

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
  ['type', 'ESSAY'], // SP-115G: invalid enum — no stored display copy.
  ['type', 1], // SP-115G: numeric type is not an identifier.
  ['type', ''],
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
          type: null,
          createdAt: now,
          updatedAt: now,
          ...data,
        })),
      },
    };
    service = new AssignmentsService(prisma as unknown as PrismaService);
  });

  it('returns exactly the 11-key projection (type after priority) and leaves defaults to Prisma', async () => {
    expect(await service.create('student', { title: '  Essay  ' })).toEqual({
      id: 'assignment',
      title: 'Essay',
      description: null,
      dueDate: null,
      estimatedHours: null,
      actualHours: null,
      status: 'PENDING',
      priority: 'MEDIUM',
      type: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
    expect(prisma.assignment.create).toHaveBeenCalledWith({
      data: { userId: 'student', title: 'Essay', courseId: null },
    });
    expect(prisma.course.findFirst).not.toHaveBeenCalled();
  });

  it.each(['HOMEWORK', 'PAPER', 'PROJECT', 'QUIZ', 'EXAM'] as const)(
    'stores each assignment type (%s) and returns it',
    async (type) => {
      const result = await service.create('student', { title: 'Essay', type });
      expect(prisma.assignment.create).toHaveBeenCalledWith({
        data: {
          userId: 'student',
          courseId: null,
          title: 'Essay',
          type,
        },
      });
      expect(result).toMatchObject({ type });
    }
  );

  it('accepts all fields, past deadlines and upper bounds; scopes the course gate', async () => {
    const dto: CreateAssignmentDto = {
      title: 'x'.repeat(200),
      courseId: 'own-course',
      dueDate: '2020-01-01T12:00:00Z',
      estimatedHours: 1000,
      priority: 'URGENT',
      type: 'EXAM',
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
      type: 'EXAM',
      description: dto.description,
      dueDate: '2020-01-01T12:00:00.000Z',
    });
    expect(result).not.toHaveProperty('courseId');
  });

  it('normalizes optional nulls, including courseId and type (D115-2)', async () => {
    await service.create('student', {
      title: 'Essay',
      courseId: null,
      dueDate: null,
      estimatedHours: null,
      priority: null,
      type: null,
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

  // `type: 'ESSAY'` is a field-level enum rejection now (SP-115G); `EXAM`
  // became a whitelisted, valid value and no longer rejects.
  it.each([...invalid, ['status', 'COMPLETED'], ['userId', 'other']])(
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
        type: 'QUIZ',
        description: '',
      })
    ).resolves.toBeInstanceOf(CreateAssignmentDto);
  });
  it('accepts an omitted type and an explicit type null', async () => {
    await expect(validate({ title: 'Essay', type: null })).resolves.toBeInstanceOf(
      CreateAssignmentDto
    );
    await expect(validate({ title: 'Essay' })).resolves.toBeInstanceOf(CreateAssignmentDto);
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
    type: 'HOMEWORK', // SP-115G: the stored type updates merge against.
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

  it('updates only the provided fields, preserves the rest, returns the 11-key projection', async () => {
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
      type: 'HOMEWORK',
      createdAt: now.toISOString(),
      updatedAt: later.toISOString(),
    });
  });

  it('replaces the stored type when patched with a valid value (D115-3)', async () => {
    const result = await service.update('student', 'assignment', { type: 'PAPER' });
    expect(prisma.assignment.update).toHaveBeenCalledWith({
      where: { id: 'assignment', userId: 'student' },
      data: { type: 'PAPER' },
    });
    expect(result).toMatchObject({ type: 'PAPER' });
  });

  it.each([null, undefined] as const)(
    'keeps the stored type when patched with %p (D115-3 keep-on-null)',
    async (value) => {
      const body: UpdateAssignmentDto =
        value === null ? { title: 'Kept', type: null } : { title: 'Kept' };
      const result = await service.update('student', 'assignment', body);
      expect(prisma.assignment.update).toHaveBeenCalledWith({
        where: { id: 'assignment', userId: 'student' },
        data: { title: 'Kept' },
      });
      expect(result).toMatchObject({ type: 'HOMEWORK' });
    }
  );

  it('accepts a type-only patch as a non-empty body (SP-115G contract)', async () => {
    const result = await service.update('student', 'assignment', { type: 'QUIZ' });
    expect(prisma.assignment.update).toHaveBeenCalledWith({
      where: { id: 'assignment', userId: 'student' },
      data: { type: 'QUIZ' },
    });
    expect(result).toMatchObject({ type: 'QUIZ' });
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
    ['type', 'ESSAY'], // SP-115G: invalid enum, field-level 400, no write.
    ['type', 1],
    ['type', ''],
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

  it('treats explicit nulls as omitted and keeps the stored values (D114-5, D115-3)', async () => {
    await service.update('student', 'assignment', {
      title: 'Kept',
      description: null,
      dueDate: null,
      estimatedHours: null,
      priority: null,
      type: null,
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
      {
        title: null,
        description: null,
        dueDate: null,
        estimatedHours: null,
        priority: null,
        type: null,
      },
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
    ['type', 'ESSAY'], // SP-115G: invalid enum at pipe level.
    ['type', 1],
    ['type', ''],
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
        type: 'PROJECT',
      })
    ).resolves.toBeInstanceOf(UpdateAssignmentDto);
  });

  it('accepts an omitted type and an explicit type null (D115-3 keep-on-null at pipe level)', async () => {
    await expect(validate({ title: 'Kept', type: null })).resolves.toBeInstanceOf(
      UpdateAssignmentDto
    );
    await expect(validate({ title: 'Kept' })).resolves.toBeInstanceOf(UpdateAssignmentDto);
  });

  it('accepts an empty body at pipe level (the service enforces at-least-one)', async () => {
    await expect(validate({})).resolves.toBeInstanceOf(UpdateAssignmentDto);
  });
});

// ==================== Subtasks (SP-120I, D120-1…8) ====================

describe('AssignmentsService subtasks (SP-120I)', () => {
  const now = new Date('2026-10-24T12:00:00Z');
  const later = new Date('2026-10-24T13:00:00Z');
  // The assignment projection the ownership gate (select { id: true }) returns.
  const ownAssignment = { id: 'assignment' };
  // The stored subtask row every update test starts from.
  const storedSubtask = {
    id: 'subtask',
    userId: 'student',
    assignmentId: 'assignment',
    title: 'Draft outline',
    description: null,
    dueDate: null,
    estimatedMinutes: null,
    actualMinutes: null,
    status: 'PENDING',
    priority: 'MEDIUM',
    orderIndex: 0,
    createdAt: now,
    updatedAt: now,
  };
  let service: AssignmentsService;
  let prisma: {
    assignment: { findFirst: jest.Mock };
    task: {
      findMany: jest.Mock;
      aggregate: jest.Mock;
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      deleteMany: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      assignment: {
        // The ownership predicate is in the query: a hit only for the
        // student's own assignment (missing or foreign → null).
        findFirst: jest
          .fn()
          .mockImplementation(async ({ where }) =>
            where.userId === 'student' && where.id === 'assignment' ? ownAssignment : null
          ),
      },
      task: {
        findMany: jest.fn().mockResolvedValue([storedSubtask, { ...storedSubtask, id: 's2' }]),
        aggregate: jest.fn().mockResolvedValue({ _max: { orderIndex: null } }),
        create: jest.fn().mockImplementation(async ({ data }) => ({ ...storedSubtask, ...data })),
        // A hit only for the student's own subtask on the student's own
        // assignment (cross-student or cross-assignment → null).
        findFirst: jest
          .fn()
          .mockImplementation(async ({ where }) =>
            where.userId === 'student' &&
            where.id === 'subtask' &&
            where.assignmentId === 'assignment'
              ? storedSubtask
              : null
          ),
        update: jest.fn().mockImplementation(async ({ data }) => ({
          ...storedSubtask,
          ...data,
          updatedAt: later,
        })),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    service = new AssignmentsService(prisma as unknown as PrismaService);
  });

  describe('listSubtasks', () => {
    it('returns the 6-key projections under the contract ordering', async () => {
      expect(await service.listSubtasks('student', 'assignment')).toEqual([
        {
          id: 'subtask',
          title: 'Draft outline',
          status: 'PENDING',
          orderIndex: 0,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        },
        {
          id: 's2',
          title: 'Draft outline',
          status: 'PENDING',
          orderIndex: 0,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        },
      ]);
      expect(prisma.assignment.findFirst).toHaveBeenCalledWith({
        where: { id: 'assignment', userId: 'student' },
        select: { id: true },
      });
      expect(prisma.task.findMany).toHaveBeenCalledWith({
        where: { userId: 'student', assignmentId: 'assignment' },
        orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
      });
    });

    it.each([
      ['missing id', 'student', uuid()],
      ['foreign owner', 'other-student', 'assignment'],
      ['malformed id', 'student', 'not-an-id'],
      ['empty id', 'student', ''],
    ])('list %s → uniform 404 and no subtask query', async (_label, userId, id) => {
      await expect(service.listSubtasks(userId, id)).rejects.toEqual(
        new NotFoundException('Resource not found')
      );
      expect(prisma.task.findMany).not.toHaveBeenCalled();
    });
  });

  describe('createSubtask', () => {
    it('appends at the end (max + 1, or 0 for the first) and leaves status to the default', async () => {
      const result = await service.createSubtask('student', 'assignment', {
        title: '  Read chapter 1  ',
      });
      expect(prisma.task.aggregate).toHaveBeenCalledWith({
        where: { userId: 'student', assignmentId: 'assignment' },
        _max: { orderIndex: true },
      });
      expect(prisma.task.create).toHaveBeenCalledWith({
        data: {
          userId: 'student',
          assignmentId: 'assignment',
          title: 'Read chapter 1',
          orderIndex: 0,
        },
      });
      expect(Object.keys(result).sort()).toEqual(
        ['id', 'title', 'status', 'orderIndex', 'createdAt', 'updatedAt'].sort()
      );
      expect(result).toEqual({
        id: 'subtask',
        title: 'Read chapter 1',
        status: 'PENDING',
        orderIndex: 0,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
    });

    it('appends after the existing maximum (D120-7 append-on-create)', async () => {
      prisma.task.aggregate.mockResolvedValue({ _max: { orderIndex: 4 } });
      await service.createSubtask('student', 'assignment', { title: 'Another' });
      expect(prisma.task.create).toHaveBeenCalledWith({
        data: {
          userId: 'student',
          assignmentId: 'assignment',
          title: 'Another',
          orderIndex: 5,
        },
      });
    });

    it('stores an explicit orderIndex without shifting anything', async () => {
      await service.createSubtask('student', 'assignment', { title: 'First', orderIndex: 10 });
      expect(prisma.task.aggregate).not.toHaveBeenCalled();
      expect(prisma.task.create).toHaveBeenCalledWith({
        data: {
          userId: 'student',
          assignmentId: 'assignment',
          title: 'First',
          orderIndex: 10,
        },
      });
    });

    it('treats an explicit orderIndex null as omitted and still appends (D113 create pattern)', async () => {
      await service.createSubtask('student', 'assignment', { title: 'Appended', orderIndex: null });
      expect(prisma.task.aggregate).toHaveBeenCalled();
      expect(prisma.task.create).toHaveBeenCalledWith({
        data: {
          userId: 'student',
          assignmentId: 'assignment',
          title: 'Appended',
          orderIndex: 0,
        },
      });
    });

    it.each([
      ['title', undefined],
      ['title', null],
      ['title', 42],
      ['title', '   '],
      ['title', 'x'.repeat(201)],
      ['orderIndex', -1],
      ['orderIndex', 2.5],
      ['orderIndex', '2'],
      ['orderIndex', NaN],
      ['status', 'COMPLETED'],
      ['priority', 'HIGH'],
      ['description', 'notes'],
      ['dueDate', '2026-11-01T10:00:00Z'],
      ['estimatedMinutes', 30],
      ['actualMinutes', 30],
      ['userId', 'other'],
      ['assignmentId', 'elsewhere'],
    ] as const)(
      'rechecks invalid/unknown %s=%p with field errors and no write',
      async (field, value) => {
        try {
          await service.createSubtask('student', 'assignment', {
            title: 'Subtask',
            [field]: value,
          } as CreateSubtaskDto);
          throw new Error('expected validation error');
        } catch (error) {
          expect(error).toBeInstanceOf(BadRequestException);
          expect((error as BadRequestException).getResponse()).toMatchObject({
            errors: { [field]: expect.any(Array) },
          });
        }
        expect(prisma.assignment.findFirst).not.toHaveBeenCalled();
        expect(prisma.task.aggregate).not.toHaveBeenCalled();
        expect(prisma.task.create).not.toHaveBeenCalled();
      }
    );

    it.each([
      ['missing id', 'student', uuid()],
      ['foreign owner', 'other-student', 'assignment'],
      ['malformed id', 'student', 'not-an-id'],
      ['empty id', 'student', ''],
    ])('create %s → uniform 404 and no write', async (_label, userId, id) => {
      await expect(service.createSubtask(userId, id, { title: 'Subtask' })).rejects.toEqual(
        new NotFoundException('Resource not found')
      );
      expect(prisma.task.create).not.toHaveBeenCalled();
    });
  });

  describe('updateSubtask', () => {
    it('updates only the provided fields, keeps the rest, returns the 6-key projection', async () => {
      const result = await service.updateSubtask('student', 'assignment', 'subtask', {
        title: '  Draft outline v2  ',
      });
      expect(prisma.assignment.findFirst).toHaveBeenCalledWith({
        where: { id: 'assignment', userId: 'student' },
        select: { id: true },
      });
      expect(prisma.task.findFirst).toHaveBeenCalledWith({
        where: { id: 'subtask', userId: 'student', assignmentId: 'assignment' },
      });
      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: 'subtask', userId: 'student', assignmentId: 'assignment' },
        data: { title: 'Draft outline v2' },
      });
      expect(result).toEqual({
        id: 'subtask',
        title: 'Draft outline v2',
        status: 'PENDING',
        orderIndex: 0,
        createdAt: now.toISOString(),
        updatedAt: later.toISOString(),
      });
    });

    it('toggles completion status and reorders without the other fields', async () => {
      const completed = await service.updateSubtask('student', 'assignment', 'subtask', {
        status: 'COMPLETED',
      });
      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: 'subtask', userId: 'student', assignmentId: 'assignment' },
        data: { status: 'COMPLETED' },
      });
      expect(completed).toMatchObject({ status: 'COMPLETED', title: 'Draft outline' });

      await service.updateSubtask('student', 'assignment', 'subtask', { orderIndex: 3 });
      expect(prisma.task.update).toHaveBeenLastCalledWith({
        where: { id: 'subtask', userId: 'student', assignmentId: 'assignment' },
        data: { orderIndex: 3 },
      });
    });

    it('treats explicit nulls as omitted and keeps the stored values', async () => {
      await service.updateSubtask('student', 'assignment', 'subtask', {
        title: 'Kept',
        status: null,
        orderIndex: null,
      });
      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: 'subtask', userId: 'student', assignmentId: 'assignment' },
        data: { title: 'Kept' },
      });
    });

    it.each([{}, { title: null, status: null, orderIndex: null }])(
      'PATCH %p body → 400 at-least-one without a query or write',
      async (body) => {
        await expect(
          service.updateSubtask('student', 'assignment', 'subtask', body as UpdateSubtaskDto)
        ).rejects.toEqual(new BadRequestException('At least one field must be provided'));
        // The assignment gate has already run (the SP-114D order: ownership
        // before body shape); no subtask read/write happens.
        expect(prisma.task.findFirst).not.toHaveBeenCalled();
        expect(prisma.task.update).not.toHaveBeenCalled();
      }
    );

    it.each([
      ['title', 42],
      ['title', '   '],
      ['title', 'x'.repeat(201)],
      ['orderIndex', -1],
      ['orderIndex', 2.5],
      ['orderIndex', '2'],
      ['orderIndex', NaN],
    ] as const)(
      'rechecks invalid merged %s=%p with field errors and no write',
      async (field, value) => {
        try {
          await service.updateSubtask('student', 'assignment', 'subtask', {
            [field]: value,
          } as UpdateSubtaskDto);
          throw new Error('expected validation error');
        } catch (error) {
          expect(error).toBeInstanceOf(BadRequestException);
          expect((error as BadRequestException).getResponse()).toMatchObject({
            errors: { [field]: expect.any(Array) },
          });
        }
        expect(prisma.assignment.findFirst).not.toHaveBeenCalled();
        expect(prisma.task.update).not.toHaveBeenCalled();
      }
    );

    it('validates merged values against the stored row (status stays valid when reordering)', async () => {
      // D120-4 re-check: a valid status patch keeps the stored title, so
      // the merged body must still validate — no false rejection.
      const merged = await service.updateSubtask('student', 'assignment', 'subtask', {
        status: 'COMPLETED',
      });
      expect(merged).toMatchObject({ status: 'COMPLETED', title: 'Draft outline' });
    });

    it.each([
      ['status', 'ARCHIVED'],
      ['status', 'IN_PROGRESS'],
      ['priority', 'HIGH'],
      ['description', 'notes'],
      ['userId', 'other'],
      ['assignmentId', 'elsewhere'],
    ] as const)(
      'rejects unknown %s=%p on the patch with a field-level 400 and no write',
      async (field, value) => {
        await expect(
          service.updateSubtask('student', 'assignment', 'subtask', {
            title: 'Patch',
            [field]: value,
          } as UpdateSubtaskDto)
        ).rejects.toMatchObject({ response: { errors: { [field]: expect.any(Array) } } });
        expect(prisma.task.update).not.toHaveBeenCalled();
      }
    );
  });

  describe('deleteSubtask', () => {
    it('deletes with the scoped predicate scoped by userId and assignmentId', async () => {
      expect(await service.deleteSubtask('student', 'assignment', 'subtask')).toBeUndefined();
      expect(prisma.assignment.findFirst).toHaveBeenCalledWith({
        where: { id: 'assignment', userId: 'student' },
        select: { id: true },
      });
      expect(prisma.task.deleteMany).toHaveBeenCalledWith({
        where: { id: 'subtask', userId: 'student', assignmentId: 'assignment' },
      });
    });

    it('a count of 0 → uniform 404 (no existence oracle)', async () => {
      prisma.task.deleteMany.mockResolvedValue({ count: 0 });
      await expect(service.deleteSubtask('student', 'assignment', 'subtask')).rejects.toEqual(
        new NotFoundException('Resource not found')
      );
    });
  });

  describe('subtask ownership gates', () => {
    it('a foreign/missing assignment blocks list/create/delete before any subtask query', async () => {
      for (const userId of ['other-student', 'student']) {
        for (const id of ['assignment', uuid(), 'not-an-id']) {
          if (userId === 'student' && id === 'assignment') continue; // the own hit
          await expect(service.listSubtasks(userId, id)).rejects.toEqual(
            new NotFoundException('Resource not found')
          );
          await expect(service.createSubtask(userId, id, { title: 'Blocked' })).rejects.toEqual(
            new NotFoundException('Resource not found')
          );
          await expect(service.deleteSubtask(userId, id, 'subtask')).rejects.toEqual(
            new NotFoundException('Resource not found')
          );
        }
      }
      expect(prisma.task.findMany).not.toHaveBeenCalled();
      expect(prisma.task.create).not.toHaveBeenCalled();
      expect(prisma.task.deleteMany).not.toHaveBeenCalled();
    });

    it('a foreign assignment also blocks the patch before the subtask query', async () => {
      await expect(
        service.updateSubtask('other-student', 'assignment', 'subtask', { title: 'Hijack' })
      ).rejects.toEqual(new NotFoundException('Resource not found'));
      expect(prisma.task.findFirst).not.toHaveBeenCalled();
      expect(prisma.task.update).not.toHaveBeenCalled();
    });

    it('a subtask not matching the three-scope triple → uniform 404 on patch (cross-student, cross-assignment, missing)', async () => {
      for (const where of [
        { subtaskId: 'subtask', assignmentId: 'assignment', userId: 'other-student' } as const,
        { subtaskId: 'subtask', assignmentId: 'other-assignment', userId: 'student' } as const,
        { subtaskId: 'missing', assignmentId: 'assignment', userId: 'student' } as const,
      ]) {
        await expect(
          service.updateSubtask(where.userId, where.assignmentId, where.subtaskId, {
            title: 'Hijack',
          })
        ).rejects.toEqual(new NotFoundException('Resource not found'));
      }
      expect(prisma.task.update).not.toHaveBeenCalled();
    });

    it('a subtask from a different assignment → uniform 404 and the target row survives', async () => {
      await expect(service.deleteSubtask('student', 'other-assignment', 'subtask')).rejects.toEqual(
        new NotFoundException('Resource not found')
      );
      await expect(
        service.updateSubtask('student', 'other-assignment', 'subtask', { status: 'COMPLETED' })
      ).rejects.toEqual(new NotFoundException('Resource not found'));
      expect(prisma.task.deleteMany).not.toHaveBeenCalled();
      expect(prisma.task.update).not.toHaveBeenCalled();
    });
  });
});

describe('CreateSubtaskDto with production FieldValidationPipe', () => {
  const pipe = new FieldValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  });
  const validate = (body: Record<string, unknown>) =>
    pipe.transform(body, { type: 'body', metatype: CreateSubtaskDto });

  it.each([
    ['title', undefined],
    ['title', null],
    ['title', 42],
    ['title', '   '],
    ['title', 'x'.repeat(201)],
    ['orderIndex', -1],
    ['orderIndex', 2.5],
    ['orderIndex', '2'],
    ['orderIndex', NaN],
    ['status', 'COMPLETED'],
    ['status', 'PENDING'],
    ['priority', 'HIGH'],
    ['description', 'notes'],
    ['dueDate', '2026-11-01T10:00:00Z'],
    ['estimatedMinutes', 30],
    ['actualMinutes', 30],
    ['userId', 'other'],
    ['assignmentId', 'elsewhere'],
  ] as const)(
    'rejects %s=%p at pipe level (D120-3 lifecycle fields locked)',
    async (field, value) => {
      await expect(validate({ title: 'Check', [field]: value })).rejects.toMatchObject({
        response: { errors: { [field]: expect.any(Array) } },
      });
    }
  );

  it('accepts a valid create body with omitted orderIndex', async () => {
    await expect(validate({ title: 'Check' })).resolves.toBeInstanceOf(CreateSubtaskDto);
    await expect(validate({ title: 'Check', orderIndex: 7 })).resolves.toBeInstanceOf(
      CreateSubtaskDto
    );
    await expect(validate({ title: 'Check', orderIndex: null })).resolves.toBeInstanceOf(
      CreateSubtaskDto
    );
  });
});

describe('UpdateSubtaskDto with production FieldValidationPipe', () => {
  const pipe = new FieldValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  });
  const validate = (body: Record<string, unknown>) =>
    pipe.transform(body, { type: 'body', metatype: UpdateSubtaskDto });

  it.each([
    ['title', 42],
    ['title', '   '],
    ['title', 'x'.repeat(201)],
    ['orderIndex', -1],
    ['orderIndex', 2.5],
    ['orderIndex', '2'],
    ['orderIndex', NaN],
    ['status', 'ARCHIVED'],
    ['status', 'IN_PROGRESS'],
    ['status', 1],
    ['priority', 'HIGH'],
    ['description', 'notes'],
    ['userId', 'other'],
    ['assignmentId', 'elsewhere'],
  ] as const)(
    'rejects %s=%p at pipe level (D120-4: PENDING/COMPLETED only)',
    async (field, value) => {
      await expect(validate({ title: 'Check', [field]: value })).rejects.toMatchObject({
        response: { errors: { [field]: expect.any(Array) } },
      });
    }
  );

  it('accepts a valid partial patch body', async () => {
    await expect(validate({ title: 'Check' })).resolves.toBeInstanceOf(UpdateSubtaskDto);
    await expect(validate({ status: 'COMPLETED', orderIndex: 5 })).resolves.toBeInstanceOf(
      UpdateSubtaskDto
    );
    await expect(validate({ title: null, status: null, orderIndex: null })).resolves.toBeInstanceOf(
      UpdateSubtaskDto
    );
  });

  it('accepts an empty body at pipe level (the service enforces at-least-one)', async () => {
    await expect(validate({})).resolves.toBeInstanceOf(UpdateSubtaskDto);
  });
});
