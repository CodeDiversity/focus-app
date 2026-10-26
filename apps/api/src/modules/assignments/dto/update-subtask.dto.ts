import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

/**
 * Body accepted by PATCH /assignments/:id/subtasks/:subtaskId (SP-120I,
 * D120-3/4/7).
 *
 * Partial merge, the `UpdateAssignmentDto` pattern: every field is optional,
 * an explicit `null` is treated as omitted (the stored value is kept), and
 * the service validates the **merged** (post-patch) values — at least one
 * field must be provided (empty body → 400). The global `FieldValidationPipe`
 * (whitelist + `forbidNonWhitelisted`) rejects unknown fields with a 400.
 *
 * Field rules (mirroring the SP-120 shared contract):
 * - `title` non-whitespace ≤ 200 (raw type preserved, the create pattern).
 * - `status` only `PENDING` | `COMPLETED` (D120-4: the checkbox toggle —
 *   `IN_PROGRESS`/`ARCHIVED` stay EP06 lifecycle states and are rejected as
 *   field errors, whether unknown to the DTO or explicitly sent).
 * - `orderIndex` integer ≥ 0 (reorder is a client-side swap between
 *   adjacent subtasks — two PATCH calls, D120-7).
 */
export class UpdateSubtaskDto {
  @Transform(({ obj, key }) => obj[key])
  @IsOptional()
  @IsString()
  @Matches(/\S/, { message: 'title must not be empty' })
  @MaxLength(200)
  title?: string | null;

  @IsOptional()
  @IsIn(['PENDING', 'COMPLETED'])
  status?: 'PENDING' | 'COMPLETED' | null;

  @Transform(({ obj, key }) => obj[key])
  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number | null;
}
