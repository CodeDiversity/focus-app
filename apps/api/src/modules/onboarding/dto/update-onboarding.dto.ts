import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

/**
 * Partial body accepted by PATCH /onboarding.
 *
 * All fields are optional so that partial updates are valid (e.g.
 * `{ step: 2 }` without `completed` or `semesterId`).  The global
 * `FieldValidationPipe` (whitelist + `forbidNonWhitelisted`) rejects
 * unknown fields with a 400 — the controller must declare this class as
 * the `@Body()` metatype for the pipe to apply it.
 *
 * Field rules (shared API contract, SP-107 README): `step` is an integer
 * 1–3; `completed` is a boolean (`completed: false` is rejected by the
 * service, which owns the terminal-state semantics); `semesterId` is a
 * UUID (ids are `@default(uuid())`); a malformed value → 400 with a
 * field-level `errors` map, while a well-formed id that is missing or
 * foreign → 404 (service, ownership convention).  The service repeats the
 * step range / completed checks as defense in depth.
 */
export class UpdateOnboardingDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  step?: number;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @IsOptional()
  @IsString()
  @IsUUID()
  semesterId?: string | null;
}
