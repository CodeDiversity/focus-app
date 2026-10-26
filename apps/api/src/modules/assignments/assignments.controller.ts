import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { CreateSubtaskDto } from './dto/create-subtask.dto';
import { UpdateSubtaskDto } from './dto/update-subtask.dto';

/**
 * Assignment endpoints (SP-113A `POST`; SP-114D `PATCH`/`DELETE`).
 * Authentication is enforced by AuthModule's global APP_GUARD.
 *
 * `CreateAssignmentDto` / `UpdateAssignmentDto` are the `@Body()` metatypes
 * so the global `FieldValidationPipe` (D106-6) applies: `whitelist` +
 * `forbidNonWhitelisted` → unknown fields 400 with a field-level `errors`
 * map.
 *
 * `:id` is a plain string on purpose (repo convention): a malformed id is
 * "missing" per the contract and 404s (uniform `Resource not found`), never
 * 400.
 */
@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignments: AssignmentsService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAssignmentDto) {
    return this.assignments.create(user.id, dto);
  }

  /**
   * PATCH /assignments/:id — partial merge of `{ title?, description?,
   * dueDate?, estimatedHours?, priority?, type? }` (at least one field;
   * explicit nulls keep the stored values — for `type` the stored one is
   * kept, D115-3 — `description: ''` clears, D114-5; unknown fields → 400).
   *
   * 200 → the updated 11-key projection (`type` after `priority`, SP-115G);
   * 400 → field-level errors (or empty body); 404 → uniform `Resource not
   * found` (missing/foreign/malformed); 401 → unauthenticated (global guard).
   */
  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateAssignmentDto
  ) {
    return this.assignments.update(user.id, id, dto);
  }

  /**
   * DELETE /assignments/:id — remove the assignment (D114-3).  Subtasks
   * persist with `assignmentId: null` (Prisma default `SetNull`, D114-4).
   *
   * 204 → deleted, no body; 404 → uniform `Resource not found`
   * (missing/foreign/malformed); 401 → unauthenticated (global guard).
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    await this.assignments.delete(user.id, id);
  }

  // ==================== Subtasks (SP-120I, D120-2/3/4/7) ====================

  /**
   * GET /assignments/:id/subtasks — the ordered 6-key subtask list
   * (`orderIndex` asc, then `createdAt` asc).
   *
   * 200 → `Subtask[]`; 404 → uniform `Resource not found`
   * (missing/foreign/malformed assignment); 401 → unauthenticated.
   */
  @Get(':id/subtasks')
  listSubtasks(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.assignments.listSubtasks(user.id, id);
  }

  /**
   * POST /assignments/:id/subtasks — create a subtask: `{ title?,
   * orderIndex? }` only; omitted/null `orderIndex` appends at the end
   * (D120-7). Status is never taken from the client (schema default
   * `PENDING`, D120-4).
   *
   * 201 → the 6-key projection; 400 → field-level errors (title/
   * orderIndex, unknown fields); 404 → uniform; 401 → unauthenticated.
   */
  @Post(':id/subtasks')
  createSubtask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateSubtaskDto
  ) {
    return this.assignments.createSubtask(user.id, id, dto);
  }

  /**
   * PATCH /assignments/:id/subtasks/:subtaskId — partial merge of
   * `{ title?, status?, orderIndex? }` (at least one field; explicit nulls
   * keep the stored values; merged-value validation, the SP-114D pattern).
   * `status` accepts only `PENDING` | `COMPLETED` (D120-4).
   *
   * 200 → the updated 6-key projection; 400 → field-level errors (or empty
   * body); 404 → uniform (assignment or subtask missing/foreign, or the
   * subtask belongs to a different assignment); 401 → unauthenticated.
   */
  @Patch(':id/subtasks/:subtaskId')
  updateSubtask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('subtaskId') subtaskId: string,
    @Body() dto: UpdateSubtaskDto
  ) {
    return this.assignments.updateSubtask(user.id, id, subtaskId, dto);
  }

  /**
   * DELETE /assignments/:id/subtasks/:subtaskId — remove the subtask
   * (scoped `{ userId, assignmentId }`). The assignment stays untouched;
   * the order of the remaining subtasks is not shifted (D120-7).
   *
   * 204 → deleted, no body; 404 → uniform (same conditions as PATCH);
   * 401 → unauthenticated.
   */
  @Delete(':id/subtasks/:subtaskId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSubtask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('subtaskId') subtaskId: string
  ) {
    await this.assignments.deleteSubtask(user.id, id, subtaskId);
  }
}
