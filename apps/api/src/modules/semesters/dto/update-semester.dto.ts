import { IsBoolean, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

/**
 * Body accepted by PATCH /semesters/:id (SP-110A, D110-5).
 *
 * Every field is optional — the request is a **partial merge**: omitted
 * fields keep the stored value, and validation runs on the **merged**
 * (post-patch) values in the service (backend authoritative).  The global
 * `FieldValidationPipe` (whitelist + `forbidNonWhitelisted`) rejects unknown
 * fields (a `userId` field included) with a 400 — the controller declares
 * this class as the `@Body()` metatype so the pipe applies.
 *
 * Field rules mirror `CreateSemesterDto` (shared API contract, SP-110
 * README): `name` non-empty after trim, ≤ 100 chars; `startDate`/`endDate`
 * strict `yyyy-MM-dd` calendar dates (D107-7); `endDate` strictly after
 * `startDate` (cross-field, service-owned).  `isActive` is the only
 * activation path (D110-1): `true` triggers the single-active transaction,
 * `false` deactivates only the target.
 */
export class UpdateSemesterDto {
  @IsOptional()
  @IsString()
  @Matches(/\S/, { message: 'name must not be empty' })
  @MaxLength(100, { message: 'name must be 100 characters or fewer' })
  name?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'startDate must be a valid yyyy-MM-dd calendar date',
  })
  startDate?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'endDate must be a valid yyyy-MM-dd calendar date',
  })
  endDate?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean | null;
}
