import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';

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
}
