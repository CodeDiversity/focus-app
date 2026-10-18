import {
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
} from 'class-validator';

/**
 * Body accepted by POST /courses (SP-107B, D107-6).
 *
 * The global `FieldValidationPipe` (whitelist + `forbidNonWhitelisted`)
 * rejects unknown fields (a `userId` field included) with a 400 — the
 * controller declares this class as the `@Body()` metatype so the pipe
 * applies.  The service repeats every check as defense in depth (backend
 * authoritative, ticket AC-5) and owns the `semesterId` ownership check
 * (missing or foreign → uniform 404) plus the duplicate-code 409.
 *
 * Field rules (shared API contract, SP-107 README): `code` non-empty, ≤ 20
 * chars; `name` non-empty, ≤ 100 chars; `credits` when present
 * `0 < c ≤ 30`; `color` when present `#rrggbb`; `description` ≤ 2000 chars.
 * `semesterId` is a plain string on purpose: a malformed id is "missing"
 * per the contract and 404s (uniform `Resource not found`), never 400.
 */
export class CreateCourseDto {
  @IsString()
  @Matches(/\S/, { message: 'code must not be empty' })
  @MaxLength(20, { message: 'code must be 20 characters or fewer' })
  code: string;

  @IsString()
  @Matches(/\S/, { message: 'name must not be empty' })
  @MaxLength(100, { message: 'name must be 100 characters or fewer' })
  name: string;

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
}
