import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { validateSync } from 'class-validator';
import { Assignment, AssignmentStatus, Prisma, TaskStatus } from '../../generated/prisma/client';
import { ownedWhere, RESOURCE_NOT_FOUND, assertAffected } from '../../common/ownership/ownership';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { CreateSubtaskDto } from './dto/create-subtask.dto';
import { UpdateSubtaskDto } from './dto/update-subtask.dto';
import { ListAssignmentsQueryDto } from './dto/list-assignments-query.dto';

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
    type: row.type, // SP-115G (D115-4): 11-key projection, `type` after `priority`.
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * The 6-key subtask projection (SP-120I, D120-3): the only fields the MVP
 * checklist needs. `userId`/`assignmentId` are never exposed and the unused
 * Task fields (`description`, `dueDate`, `estimatedMinutes`, `actualMinutes`,
 * `priority`) are dropped — D120-3/D120-4 keep the lifecycle fields locked.
 */
function toSubtaskResponse(row: {
  id: string;
  title: string;
  status: string;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    orderIndex: row.orderIndex,
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
        // D115-2: `type` omitted or null stores null — no schema default.
        ...(dto.type != null ? { type: dto.type } : {}),
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
   * - `type` (SP-115G, D115-3): omitted/null keeps the stored type (no clear
   *   sentinel); a valid value replaces it; a type-only body counts as a
   *   non-empty patch.
   * - `status` (SP-121A, D121-2/3): the closed five-value `AssignmentStatus`
   *   enum; omitted/null keeps the stored status; a status-only body counts
   *   as a non-empty patch; any other value → field-level 400, no write.
   * - Unknown fields (`actualHours`, `courseId`, `userId`) → 400
   *   with a field-level `errors` map (whitelist + `forbidNonWhitelisted`).
   * - A missing, foreign, or malformed assignment id → uniform 404
   *   `Resource not found` (the ownership predicate is in the query; both
   *   cases are indistinguishable — no existence oracle).
   * - Response: the updated 11-key projection (`type` after `priority`).
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
      !has(dto.priority) &&
      !has(dto.type) && // SP-115G: a type-only patch is a non-empty body.
      !has(dto.status) // SP-121A (D121-3): a status-only patch is a non-empty body.
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
      type: has(dto.type) ? dto.type! : existing.type,
      status: has(dto.status) ? dto.status! : existing.status,
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
      type?: 'HOMEWORK' | 'PAPER' | 'PROJECT' | 'QUIZ' | 'EXAM';
      status?: AssignmentStatus;
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
    if (has(dto.type)) {
      data.type = merged.type!;
    }
    if (has(dto.status)) {
      // SP-121A: the merged value equals the requested enum value here —
      // `has()` already excluded omitted/null.
      data.status = merged.status as AssignmentStatus;
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
   * Cross-course list (SP-122A, D122-1…7): returns the authenticated
   * student's assignments across courses, filtered by `courseId`, `status`,
   * `priority`, `type`, `dueFrom`/`dueTo`, and `q`, and ordered by
   * `sort`/`order`. Each row carries its course context and its subtasks.
   *
   * - `courseId`, when present, must be the student's own course — a
   *   missing/foreign/malformed id throws the uniform 404 before any
   *   assignment query runs (no existence oracle).
   * - `dueFrom`/`dueTo` are inclusive bounds on `dueDate`; rows with a null
   *   `dueDate` are excluded whenever either bound is present.
   * - `q` is trimmed; empty/whitespace-only `q` is treated as absent.
   * - Default ordering: `dueDate asc` (nulls last), then `title asc`,
   *   then `id asc`. Ties are broken by `title asc`, then `id asc`.
   */
  async list(userId: string, query: ListAssignmentsQueryDto) {
    // Defense in depth for non-HTTP callers: rerun the complete DTO rules
    // (whitelist + forbidNonWhitelisted) before any query.
    const failures = validateSync(Object.assign(new ListAssignmentsQueryDto(), query), {
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

    // courseId ownership gate: runs before any assignment query.
    const courseId = query.courseId ?? null;
    if (courseId) {
      const course = await this.prisma.course.findFirst({
        where: ownedWhere(userId, courseId),
        select: { id: true },
      });
      if (!course) throw new NotFoundException(RESOURCE_NOT_FOUND);
    }

    // Trimmed search text; empty/whitespace-only becomes absent.
    const q = typeof query.q === 'string' ? query.q.trim() : '';
    const hasQ = q.length > 0;

    const dueFrom = query.dueFrom ? new Date(query.dueFrom) : null;
    const dueTo = query.dueTo ? new Date(query.dueTo) : null;

    const where: Record<string, unknown> = { userId };
    if (courseId) where.courseId = courseId;
    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.type) where.type = query.type;
    if (dueFrom || dueTo) {
      where.dueDate = {
        ...(dueFrom ? { gte: dueFrom } : {}),
        ...(dueTo ? { lte: dueTo } : {}),
      };
    }
    if (hasQ) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    const sort = query.sort ?? 'dueDate';
    const order = query.order ?? 'asc';

    // Build the orderBy list: the requested sort, then the documented
    // tie-break (`title asc`, then `id asc`). `dueDate asc` keeps nulls last
    // via PostgreSQL's default for ascending order.
    const orderBy: Record<string, unknown>[] = [];
    if (sort === 'dueDate') {
      orderBy.push({ dueDate: order });
    } else {
      orderBy.push({ [sort]: order });
    }
    orderBy.push({ title: 'asc' });
    orderBy.push({ id: 'asc' });

    const rows = await this.prisma.assignment.findMany({
      where,
      include: {
        course: { select: { id: true, name: true, code: true, color: true } },
        tasks: {
          where: { userId },
          orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
          select: {
            id: true,
            title: true,
            status: true,
            orderIndex: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy,
    });

    return rows.map(
      (row: {
        id: string;
        title: string;
        description: string | null;
        dueDate: Date | null;
        estimatedHours: number | null;
        actualHours: number | null;
        status: string;
        priority: string;
        type: string | null;
        createdAt: Date;
        updatedAt: Date;
        course: { id: string; name: string; code: string; color: string } | null;
        tasks: {
          id: string;
          title: string;
          status: string;
          orderIndex: number;
          createdAt: Date;
          updatedAt: Date;
        }[];
      }) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        dueDate: row.dueDate?.toISOString() ?? null,
        estimatedHours: row.estimatedHours,
        actualHours: row.actualHours,
        status: row.status,
        priority: row.priority,
        type: row.type,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        course: row.course
          ? {
              id: row.course.id,
              name: row.course.name,
              code: row.course.code,
              color: row.course.color,
            }
          : null,
        subtasks: row.tasks.map(
          (task: {
            id: string;
            title: string;
            status: string;
            orderIndex: number;
            createdAt: Date;
            updatedAt: Date;
          }) => ({
            id: task.id,
            title: task.title,
            status: task.status,
            orderIndex: task.orderIndex,
            createdAt: task.createdAt.toISOString(),
            updatedAt: task.updatedAt.toISOString(),
          })
        ),
      })
    );
  }

  /**
   * Ownership gate for the nested subtask routes (SP-120I, D120-2): every
   * subtask read/write first verifies the assignment belongs to the
   * requesting student. A missing, foreign, or malformed assignment id
   * throws the uniform 404 `Resource not found` **before any subtask
   * query runs** — no existence oracle.
   */
  private async assertAssignmentOwner(userId: string, id: string): Promise<void> {
    const assignment = await this.prisma.assignment.findFirst({
      where: ownedWhere(userId, id),
      select: { id: true },
    });
    if (!assignment) {
      throw new NotFoundException(RESOURCE_NOT_FOUND);
    }
  }

  /**
   * List the subtasks of one of the student's assignments (SP-120I, D120-2/3).
   * Ordered `orderIndex` asc, then `createdAt` asc (the D120-7 order
   * semantics: append-on-create, no automatic shifting). The response is
   * the 6-key projection. Orphaned tasks (D114-4, `assignmentId: null`)
   * are not `assignmentId = :id`, so they are never listed here (D120-6).
   */
  async listSubtasks(userId: string, assignmentId: string) {
    await this.assertAssignmentOwner(userId, assignmentId);
    const rows = await this.prisma.task.findMany({
      where: { userId, assignmentId },
      orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map(toSubtaskResponse);
  }

  /**
   * Create a subtask on one of the student's assignments (SP-120I).
   *
   * - Validation: the CreateSubtaskDto rules rerun here without coercion,
   *   backend authoritative (the create pattern) — unknown fields are
   *   rejected before any query or write.
   * - Order (D120-7): omitted/null `orderIndex` appends at the end —
   *   `max(orderIndex) + 1` over the assignment's subtasks, or 0 for the
   *   first. An explicit `orderIndex` is stored as given (no shifting,
   *   gaps allowed, ≥ 0).
   * - Status: never taken from the client — the schema default `PENDING`
   *   applies. Completion happens only through `PATCH` (D120-4).
   * - The write is scoped `{ userId, assignmentId }`; the response is the
   *   6-key projection.
   */
  async createSubtask(userId: string, assignmentId: string, dto: CreateSubtaskDto) {
    this.assertSubtaskDto(dto);
    await this.assertAssignmentOwner(userId, assignmentId);

    let orderIndex: number;
    if (dto.orderIndex != null) {
      orderIndex = dto.orderIndex;
    } else {
      // Append at the end (D120-7). `has()`-style normalization: the DTO
      // accepts an explicit null as omitted (D113 create pattern).
      const aggregate = await this.prisma.task.aggregate({
        where: { userId, assignmentId },
        _max: { orderIndex: true },
      });
      orderIndex = (aggregate._max.orderIndex ?? -1) + 1;
    }

    const task = await this.prisma.task.create({
      data: {
        userId,
        assignmentId,
        title: dto.title.trim(),
        // status/pr deliberately untouched: schema defaults (PENDING/MEDIUM).
        orderIndex,
      },
    });
    return toSubtaskResponse(task);
  }

  /**
   * Partial-merge update of one subtask (SP-120I, D120-4/7) — the
   * SP-114D pattern.
   *
   * - Ownership: the assignment gate first (uniform 404 before any
   *   subtask query), then the subtask read/write is scoped
   *   `{ id, userId, assignmentId }` — a subtask belonging to another
   *   student or another assignment matches nothing → the same uniform 404.
   * - At least one field must be provided (empty body → 400); explicit
   *   nulls are treated as omitted (the stored value is kept).
   * - Validation runs on the **merged** (post-patch) values: a patch of
   *   one field is only legal against the stored row (a whitespace-only
   *   title patch 400s even though the stored title was fine).
   * - `status` accepts only `PENDING` | `COMPLETED` (D120-4). A stored row
   *   outside that pair could fail the merged re-check — assignment-bound
   *   subtasks are always created `PENDING` here, so this stays a
   *   theoretical case (orphans are not surfaced, D120-6).
   * - Response: the updated 6-key projection.
   */
  async updateSubtask(
    userId: string,
    assignmentId: string,
    subtaskId: string,
    dto: UpdateSubtaskDto
  ) {
    this.assertSubtaskPatchDto(dto);
    await this.assertAssignmentOwner(userId, assignmentId);

    // An explicit null is treated as omitted — normalize before merging.
    const has = (value: unknown): boolean => value !== undefined && value !== null;
    // At least one field (contract: "partial merge; at least one field") —
    // checked before the subtask read so an empty body never queries.
    if (!has(dto.title) && !has(dto.status) && !has(dto.orderIndex)) {
      throw new BadRequestException('At least one field must be provided');
    }

    const subtask = await this.prisma.task.findFirst({
      where: { id: subtaskId, userId, assignmentId },
    });
    if (!subtask) {
      throw new NotFoundException(RESOURCE_NOT_FOUND);
    }

    const merged = Object.assign(new UpdateSubtaskDto(), {
      title: has(dto.title) ? dto.title!.trim() : subtask.title,
      status: has(dto.status) ? dto.status! : subtask.status,
      orderIndex: has(dto.orderIndex) ? dto.orderIndex! : subtask.orderIndex,
    });
    this.assertSubtaskPatchDto(merged);

    // Only the provided fields are written (partial merge).
    const data: { title?: string; status?: TaskStatus; orderIndex?: number } = {};
    if (has(dto.title)) {
      data.title = merged.title!;
    }
    if (has(dto.status)) {
      data.status = merged.status!;
    }
    if (has(dto.orderIndex)) {
      data.orderIndex = merged.orderIndex!;
    }

    try {
      const updated = await this.prisma.task.update({
        where: { id: subtaskId, userId, assignmentId },
        data,
      });
      return toSubtaskResponse(updated);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        // The target vanished (or was never this student's, on this
        // assignment) between the read and the write — the same uniform 404.
        throw new NotFoundException(RESOURCE_NOT_FOUND);
      }
      throw error;
    }
  }

  /**
   * Delete one subtask (SP-120I). The assignment gate first (uniform 404
   * before any subtask query), then a scoped `deleteMany` — the
   * `where` requires all of `{ id, userId, assignmentId }`, so a foreign
   * subtask id or a subtask on a different assignment affects no rows.
   * A count of 0 is the uniform 404 (`assertAffected`) and the assignment
   * itself is untouched.
   */
  async deleteSubtask(userId: string, assignmentId: string, subtaskId: string): Promise<void> {
    await this.assertAssignmentOwner(userId, assignmentId);
    const affected = await this.prisma.task.deleteMany({
      where: { id: subtaskId, userId, assignmentId },
    });
    assertAffected(userId, affected.count);
  }

  /**
   * Rerun the complete create-subtask DTO rules (whitelist +
   * `forbidNonWhitelisted`) and throw the field-level 400 on any failure —
   * one rule source, the create pattern.
   */
  private assertSubtaskDto(dto: CreateSubtaskDto): void {
    const failures = validateSync(Object.assign(new CreateSubtaskDto(), dto), {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    this.throwSubtaskFieldErrors(failures);
  }

  /**
   * Rerun the complete update-subtask DTO rules (whitelist +
   * `forbidNonWhitelisted`) on the requested or merged body and throw the
   * field-level 400 on any failure (the SP-114D pattern).
   */
  private assertSubtaskPatchDto(dto: UpdateSubtaskDto): void {
    const failures = validateSync(Object.assign(new UpdateSubtaskDto(), dto), {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    this.throwSubtaskFieldErrors(failures);
  }

  private throwSubtaskFieldErrors(failures: { property: string; constraints?: object }[]): void {
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
