import { IsBoolean } from 'class-validator';

/**
 * Body of `PATCH /study-plans/sessions/:sessionId/lock` (EP08E, D08-4):
 * the student's explicit lock toggle for one planned session.
 *
 * The `@Body()` metatype makes the global `FieldValidationPipe` (whitelist +
 * `forbidNonWhitelisted`, D106-6) apply: a missing, non-boolean or
 * unknown-field body is a 400 with the field-level `errors` map.
 */
export class SetSessionLockDto {
  @IsBoolean({ message: 'locked must be a boolean' })
  locked!: boolean;
}
