import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FieldValidationPipe } from '../../common/pipes/validation.pipe';
import { PrismaService } from '../prisma/prisma.service';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';

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
