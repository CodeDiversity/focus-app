import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { validateSync } from 'class-validator';
import { Assignment } from '../../generated/prisma/client';
import { ownedWhere, RESOURCE_NOT_FOUND } from '../../common/ownership/ownership';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';

function toAssignmentResponse(row: Assignment) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    dueDate: row.dueDate?.toISOString() ?? null,
    estimatedHours: row.estimatedHours,
    actualHours: row.actualHours,
    status: row.status,
    priority: row.priority,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class AssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateAssignmentDto) {
    // Defense in depth for non-HTTP callers: rerun the complete DTO rules,
    // without coercion, before any query/write. One rule source avoids drift.
    const failures = validateSync(Object.assign(new CreateAssignmentDto(), dto), {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    if (failures.length) {
      const errors = Object.fromEntries(
        failures.map((failure) => [failure.property, Object.values(failure.constraints ?? {})])
      );
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: Object.values(errors).flat(),
        errors,
      });
    }

    let courseId: string | null = null;
    if (dto.courseId !== undefined && dto.courseId !== null) {
      const course = await this.prisma.course.findFirst({
        where: ownedWhere(userId, dto.courseId),
        select: { id: true },
      });
      if (!course) throw new NotFoundException(RESOURCE_NOT_FOUND);
      courseId = course.id;
    }

    const assignment = await this.prisma.assignment.create({
      data: {
        userId,
        courseId,
        title: dto.title.trim(),
        ...(dto.description != null ? { description: dto.description } : {}),
        ...(dto.dueDate != null ? { dueDate: new Date(dto.dueDate) } : {}),
        ...(dto.estimatedHours != null ? { estimatedHours: dto.estimatedHours } : {}),
        ...(dto.priority != null ? { priority: dto.priority } : {}),
        // status and omitted priority deliberately use schema defaults.
      },
    });
    return toAssignmentResponse(assignment);
  }
}
