import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
} from 'class-validator';

/**
 * Body accepted by PATCH /courses/:id (SP-111A).
 *
 * Every field is optional — the request is a **partial merge**: omitted
 * fields keep the stored value, and validation runs on the **merged**
 * (post-patch) values in the service (backend authoritative).  The global
 * `FieldValidationPipe` (whitelist + `forbidNonWhitelisted`) rejects unknown
 * fields (a `userId` field included) with a 400 — the controller declares
 * this class as the `@Body()` metatype so the pipe applies.
 *
 * Field rules mirror `CreateCourseDto` (shared API contract, SP-111
 * README): `code` non-empty after trim, ≤ 20 chars; `name` non-empty after
 * trim, ≤ 100 chars; `credits` `0 < c ≤ 30`; `color` `#rrggbb`;
 * `description` ≤ 2000 chars; `instructor` ≤ 100 chars (D111-1).
 * `semesterId` is a plain string on purpose: a malformed id is "missing" per
 * the contract and 404s (uniform `Resource not found`), never 400.
 * `isActive` is the archive/restore path (D111-2): `false` archives,
 * `true` restores — no dedicated endpoints, no hard delete.
 */
export class UpdateCourseDto {
  @IsOptional()
  @IsString()
  @Matches(/\S/, { message: 'code must not be empty' })
  @MaxLength(20, { message: 'code must be 20 characters or fewer' })
  code?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/\S/, { message: 'name must not be empty' })
  @MaxLength(100, { message: 'name must be 100 characters or fewer' })
  name?: string | null;

  @IsOptional()
  @IsString()
  semesterId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'description must be 2000 characters or fewer' })
  description?: string | null;

  @IsOptional()
  @IsNumber()
  // class-validator 0.14 has no exclusive `@Min` — `@IsPositive()` is the
  // strict `0 < c` bound.
  @IsPositive({ message: 'credits must be greater than 0' })
  @Max(30, { message: 'credits must be 30 or fewer' })
  credits?: number | null;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'color must be a #rrggbb hex color' })
  color?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/\S/, { message: 'instructor must not be empty' })
  @MaxLength(100, { message: 'instructor must be 100 characters or fewer' })
  instructor?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean | null;
}
