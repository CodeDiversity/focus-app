import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

/**
 * Body accepted by POST /assignments/:id/subtasks (SP-120I, D120-3/4/7).
 *
 * Only the MVP checklist fields are accepted:
 * - `title` — required, non-whitespace, ≤ 200 (the D113-5 assignment-title
 *   rules). It preserves its raw type despite the global pipe's implicit
 *   conversion: a numeric title is not a title.
 * - `orderIndex` — optional integer ≥ 0; explicitly `null` means omitted
 *   (the D113 create pattern — null optionals mean omitted). The service
 *   appends at the end (`max(orderIndex) + 1`, or 0 for the first subtask,
 *   D120-7). Raw type is preserved too, so a numeric string is not a number.
 *
 * The global `FieldValidationPipe` (whitelist + `forbidNonWhitelisted`)
 * rejects everything else — `status`, `priority`, `description`, `dueDate`,
 * `estimatedMinutes`, `actualMinutes`, `userId`, `assignmentId` — with a
 * field-level 400 (D120-3: lifecycle fields off the subtask checklist).
 * Status is never taken from the client: a new subtask is `PENDING`
 * (schema default), completion happens only through PATCH.
 */
export class CreateSubtaskDto {
  @Transform(({ obj, key }) => obj[key])
  @IsString()
  @Matches(/\S/, { message: 'title must not be empty' })
  @MaxLength(200)
  title: string;

  @Transform(({ obj, key }) => obj[key])
  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number | null;
}
