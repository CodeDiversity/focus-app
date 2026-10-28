import { IsBoolean, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

/**
 * Body accepted by PATCH /availability-slots/:id (SP-128A).
 *
 * Every field is optional — the request is a **partial merge**: omitted
 * fields keep the stored value, and validation runs on the **merged**
 * (post-patch) values in the service (backend authoritative — the
 * cross-field `endTime > startTime` rule and the hour/minute bounds need
 * both fields, which a single-field decorator cannot express). At least one
 * field must be provided (empty body → 400, service check).
 *
 * The global `FieldValidationPipe` (whitelist + `forbidNonWhitelisted`)
 * rejects unknown fields (a `userId` field included) with a 400. Field rules
 * mirror `CreateAvailabilitySlotDto` (shared API contract, EP04 README):
 * `dayOfWeek` integer 0–6; times `HH:mm` 24-hour strings; `isAvailable`
 * boolean (`false` = a recurring blocked time).
 */
export class UpdateAvailabilitySlotDto {
  @IsOptional()
  @IsInt({ message: 'dayOfWeek must be an integer' })
  @Min(0, { message: 'dayOfWeek must be between 0 (Sunday) and 6 (Saturday)' })
  @Max(6, { message: 'dayOfWeek must be between 0 (Sunday) and 6 (Saturday)' })
  dayOfWeek?: number | null;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, {
    message: 'startTime must be a 24-hour HH:mm time (e.g. 09:00)',
  })
  startTime?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, {
    message: 'endTime must be a 24-hour HH:mm time (e.g. 10:30)',
  })
  endTime?: string | null;

  @IsOptional()
  @IsBoolean({ message: 'isAvailable must be a boolean' })
  isAvailable?: boolean | null;
}
