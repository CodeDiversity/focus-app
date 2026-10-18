import { IsString, Matches, MaxLength } from 'class-validator';

/**
 * Body accepted by POST /semesters (SP-107B, D107-5).
 *
 * The global `FieldValidationPipe` (whitelist + `forbidNonWhitelisted`)
 * rejects unknown fields (a `userId` field included) with a 400 — the
 * controller declares this class as the `@Body()` metatype so the pipe
 * applies.  The service repeats every check as defense in depth (backend
 * authoritative, ticket AC-2) and owns the cross-field rule
 * (`endDate` strictly after `startDate`) plus the duplicate-name 409.
 *
 * Field rules (shared API contract, SP-107 README): `name` is non-empty
 * after trim, ≤ 100 chars; `startDate`/`endDate` are strict `yyyy-MM-dd`
 * calendar dates (D107-7).  No `isActive` input — the schema default
 * `false` applies; EP02 owns activation (D107-5).
 */
export class CreateSemesterDto {
  @IsString()
  @Matches(/\S/, { message: 'name must not be empty' })
  @MaxLength(100, { message: 'name must be 100 characters or fewer' })
  name: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'startDate must be a valid yyyy-MM-dd calendar date',
  })
  startDate: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'endDate must be a valid yyyy-MM-dd calendar date',
  })
  endDate: string;
}
