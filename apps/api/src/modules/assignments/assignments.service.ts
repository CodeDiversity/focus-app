import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { validateSync } from 'class-validator';
import { Assignment, Prisma } from '../../generated/prisma/client';
import { ownedWhere, RESOURCE_NOT_FOUND } from '../../common/ownership/ownership';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';

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

  /**
   * Partial-merge update (SP-114D, D114-1…5): omitted fields and explicit
   * `null`s keep the stored value; validation runs on the **merged**
   * (post-patch) values — the service re-checks what the DTO declares
   * (backend authoritative, the create pattern).
   *
   * - At least one field must be provided (empty body → 400).
   * - `description: ''` clears the stored description — the only clearable
   *   field (D114-5); `dueDate`/`estimatedHours` cannot be cleared.
   * - Unknown fields (`status`, `actualHours`, `courseId`, `userId`) → 400
   *   with a field-level `errors` map (whitelist + `forbidNonWhitelisted`).
   * - A missing, foreign, or malformed assignment id → uniform 404
   *   `Resource not found` (the ownership predicate is in the query; both
   *   cases are indistinguishable — no existence oracle).
   * - Response: the updated 10-key `CourseAssignment` projection.
   */
  async update(userId: string, id: string, dto: UpdateAssignmentDto) {
    // Defense in depth for non-HTTP callers: rerun the complete DTO rules,
    // without coercion, before any query/write (the create pattern).
    this.assertDto(dto);

    const existing = await this.prisma.assignment.findFirst({
      where: ownedWhere(userId, id),
    });
    if (!existing) {
      throw new NotFoundException(RESOURCE_NOT_FOUND);
    }

    // An explicit null is treated as omitted (D114-5) — normalize before
    // merging.
    const has = (value: unknown): boolean => value !== undefined && value !== null;

    // At least one field (contract: "partial body; at least one field").
    if (
      !has(dto.title) &&
      !has(dto.description) &&
      !has(dto.dueDate) &&
      !has(dto.estimatedHours) &&
      !has(dto.priority)
    ) {
      throw new BadRequestException('At least one field must be provided');
    }

    // Merge the patch over the stored values, then validate the merged
    // values with the same DTO rules (a patch of one field is only legal
    // against the stored row — e.g. a whitespace-only `title` patch must
    // 400, even though the stored title was fine).  The stored `dueDate` is
    // a `Date`; serialize it to ISO so the merged value satisfies the
    // string-based datetime rules.
    const merged = Object.assign(new UpdateAssignmentDto(), {
      title: has(dto.title) ? dto.title!.trim() : existing.title,
      description: has(dto.description) ? dto.description! : existing.description,
      dueDate: has(dto.dueDate) ? dto.dueDate! : (existing.dueDate?.toISOString() ?? null),
      estimatedHours: has(dto.estimatedHours) ? dto.estimatedHours! : existing.estimatedHours,
      priority: has(dto.priority) ? dto.priority! : existing.priority,
    });
    this.assertDto(merged);

    // Only the provided fields are written (partial merge).  `has()` already
    // excludes nulls, so every key present here is non-null.
    const data: {
      title?: string;
      description?: string;
      dueDate?: Date;
      estimatedHours?: number;
      priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    } = {};
    if (has(dto.title)) {
      data.title = merged.title!;
    }
    if (has(dto.description)) {
      data.description = merged.description!;
    }
    if (has(dto.dueDate)) {
      data.dueDate = new Date(dto.dueDate!);
    }
    if (has(dto.estimatedHours)) {
      data.estimatedHours = dto.estimatedHours!;
    }
    if (has(dto.priority)) {
      data.priority = dto.priority!;
    }

    try {
      const updated = await this.prisma.assignment.update({
        where: ownedWhere(userId, id),
        data,
      });
      return toAssignmentResponse(updated);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        // The target vanished (or was never this student's) between the
        // read and the write — the same uniform 404 as the read miss.
        throw new NotFoundException(RESOURCE_NOT_FOUND);
      }
      throw error;
    }
  }

  /**
   * Delete one of the student's assignments (SP-114D, D114-3/4).
   *
   * - Ownership: the assignment must belong to the requesting student — a
   *   missing, foreign, or malformed id → uniform 404 `Resource not found`
   *   (the ownership predicate is in the query; no existence oracle).
   * - Task cascade (D114-4): the optional `Task.assignmentId` relation uses
   *   Prisma's default `SetNull` — subtasks persist with
   *   `assignmentId: null` (story 4 owns orphaned-task UX); nothing is
   *   cascade-deleted.
   * - The write is scoped `where: ownedWhere(userId, id)`; a P2025 (the row
   *   vanished between the read and the write) is normalized by the global
   *   `AllExceptionsFilter` to the same uniform 404.
   * - Returns nothing — the controller answers 204 No Content.
   */
  async delete(userId: string, id: string): Promise<void> {
    const existing = await this.prisma.assignment.findFirst({
      where: ownedWhere(userId, id),
    });
    if (!existing) {
      throw new NotFoundException(RESOURCE_NOT_FOUND);
    }
    await this.prisma.assignment.delete({ where: ownedWhere(userId, id) });
  }

  /**
   * Rerun the complete update DTO rules (whitelist + `forbidNonWhitelisted`)
   * and throw the field-level 400 on any failure — one rule source, the
   * create pattern.
   */
  private assertDto(dto: UpdateAssignmentDto): void {
    const failures = validateSync(Object.assign(new UpdateAssignmentDto(), dto), {
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
  }
}
