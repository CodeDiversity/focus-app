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

  /**
   * EP13F (D13-5) — the break the engine leaves between two consecutive
   * planned sessions. `0` is a legitimate "back-to-back" choice, so the
   * lower bound is 0, not 5.
   */
  @IsOptional()
  @IsInt({ message: 'breakMinutes must be an integer' })
  @Min(0, { message: 'breakMinutes must be between 0 and 60' })
  @Max(60, { message: 'breakMinutes must be between 0 and 60' })
  breakMinutes?: number | null;

  /**
   * EP13F (D13-5) — the share of a day's free time the engine may fill.
   * `100` restores the pre-EP13F cap-only behaviour; the 50 floor keeps the
   * cap from starving a plan.
   */
  @IsOptional()
  @IsInt({ message: 'densityPercent must be an integer' })
  @Min(50, { message: 'densityPercent must be between 50 and 100' })
  @Max(100, { message: 'densityPercent must be between 50 and 100' })
  densityPercent?: number | null;

  /** EP13K (D-K6) — the daily momentum goal in minutes. */
  @IsOptional()
  @IsInt({ message: 'dailyGoalMinutes must be an integer' })
  @Min(5, { message: 'dailyGoalMinutes must be between 5 and 480' })
  @Max(480, { message: 'dailyGoalMinutes must be between 5 and 480' })
  dailyGoalMinutes?: number | null;

  /**
   * EP13K (D-K7) — the weekly momentum goal in study days; since ▲ D17-2's
   * ruling (a) also the planning instruction for how many days of the window
   * the planner may use (EP17C).
   */
  @IsOptional()
  @IsInt({ message: 'weeklyGoalDays must be an integer' })
  @Min(1, { message: 'weeklyGoalDays must be between 1 and 7' })
  @Max(7, { message: 'weeklyGoalDays must be between 1 and 7' })
  weeklyGoalDays?: number | null;

  /**
   * EP17A (▲ D-A1) — how strongly the pacing target binds. `0` restores the
   * pre-EP17 placement exactly; it takes part in no cross-field rule.
   */
  @IsOptional()
  @IsInt({ message: 'spreadPercent must be an integer' })
  @Min(0, { message: 'spreadPercent must be between 0 and 100' })
  @Max(100, { message: 'spreadPercent must be between 0 and 100' })
  spreadPercent?: number | null;
}
