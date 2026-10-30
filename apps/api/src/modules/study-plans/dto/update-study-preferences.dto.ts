import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Body accepted by `PUT /study-preferences` (EP06A, D06-4).
 *
 * Every field is optional — the request is a **merge**: the omitted fields
 * keep the student's current *effective* values (read through the defensive
 * reader) and the validation runs on the **merged** (post-merge) values in
 * the service (the `availability` module's precedent — backend
 * authoritative). The two cross-field rules (`minSessionMinutes ≤
 * sessionLengthMinutes ≤ maxSessionMinutes` and `dailyCapMinutes ≥
 * minSessionMinutes`) need more than one field, so they live in the
 * service, not in a decorator.
 *
 * The per-field rules mirror the contract (D06-4): an integer, `5…480` for
 * the three session-length keys and `5…1440` for the daily cap.
 *
 * The global `FieldValidationPipe` (whitelist + `forbidNonWhitelisted`)
 * rejects unknown fields (a `userId` field included) with a 400, and the
 * service re-runs the same constraint set for non-HTTP callers.
 */
export class UpdateStudyPreferencesDto {
  @IsOptional()
  @IsInt({ message: 'sessionLengthMinutes must be an integer' })
  @Min(5, { message: 'sessionLengthMinutes must be between 5 and 480' })
  @Max(480, { message: 'sessionLengthMinutes must be between 5 and 480' })
  sessionLengthMinutes?: number | null;

  @IsOptional()
  @IsInt({ message: 'minSessionMinutes must be an integer' })
  @Min(5, { message: 'minSessionMinutes must be between 5 and 480' })
  @Max(480, { message: 'minSessionMinutes must be between 5 and 480' })
  minSessionMinutes?: number | null;

  @IsOptional()
  @IsInt({ message: 'maxSessionMinutes must be an integer' })
  @Min(5, { message: 'maxSessionMinutes must be between 5 and 480' })
  @Max(480, { message: 'maxSessionMinutes must be between 5 and 480' })
  maxSessionMinutes?: number | null;

  @IsOptional()
  @IsInt({ message: 'dailyCapMinutes must be an integer' })
  @Min(5, { message: 'dailyCapMinutes must be between 5 and 1440' })
  @Max(1440, { message: 'dailyCapMinutes must be between 5 and 1440' })
  dailyCapMinutes?: number | null;
}
