import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateBy,
} from 'class-validator';
import { IsCalendarDate, IsClockTime } from './calendar-date.validator';
import { ENERGY_LEVELS, type EnergyLevelInput } from './create-schedule-block.dto';

/**
 * Body accepted by `PATCH /schedule/blocks/:id` (EP15B; contracts.md →
 * *PATCH semantics*, D-B2).
 *
 * Any subset of the create fields except `kind` (immutable, D-B1 — present
 * → 400 with an actionable message), plus `effectiveFrom` (weekly only).
 * Omitted keys keep the stored value; `title`, `courseId`, `endDate` and
 * `weekdays` accept an explicit `null` as a value (clear / open-ended /
 * weekly → one-off, D-G10). Validation runs on the **merged** values in the
 * service; an empty body is a 400.
 */
export class UpdateScheduleBlockDto {
  // Declared so the 400 names the rule instead of the generic whitelist
  // message; the validator passes only when the key is absent.
  @ValidateBy({
    name: 'kindIsImmutable',
    validator: {
      validate: (value: unknown) => value === undefined,
      defaultMessage: () =>
        'kind cannot be changed after a block is created; delete the block and add it again',
    },
  })
  kind?: never;

  @IsOptional()
  @IsString({ message: 'title must be a string' })
  title?: string | null;

  @IsOptional()
  @IsString({ message: 'courseId must be a string' })
  courseId?: string | null;

  @IsOptional()
  @IsIn(ENERGY_LEVELS, { message: 'energy must be one of HIGH, NORMAL, LOW' })
  energy?: EnergyLevelInput | null;

  @IsOptional()
  @IsCalendarDate('startDate')
  startDate?: string | null;

  @IsOptional()
  @IsCalendarDate('endDate')
  endDate?: string | null;

  @IsOptional()
  @IsArray({ message: 'weekdays must be an array of weekday numbers (0 = Sunday … 6 = Saturday)' })
  @ArrayMinSize(1, { message: 'weekdays must hold at least one weekday' })
  @ArrayMaxSize(7, { message: 'weekdays must hold at most seven weekdays' })
  @ArrayUnique({ message: 'weekdays must not repeat a weekday' })
  @IsInt({ each: true, message: 'weekdays must be integers between 0 (Sunday) and 6 (Saturday)' })
  @Min(0, { each: true, message: 'weekdays must be integers between 0 (Sunday) and 6 (Saturday)' })
  @Max(6, { each: true, message: 'weekdays must be integers between 0 (Sunday) and 6 (Saturday)' })
  weekdays?: number[] | null;

  @IsOptional()
  @IsClockTime('startTime')
  startTime?: string | null;

  @IsOptional()
  @IsClockTime('endTime')
  endTime?: string | null;

  /** Weekly only: the first date the change applies to (split when `> startDate`). */
  @IsOptional()
  @IsCalendarDate('effectiveFrom')
  effectiveFrom?: string | null;
}
