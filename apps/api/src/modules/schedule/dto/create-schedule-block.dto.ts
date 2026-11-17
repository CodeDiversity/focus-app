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
} from 'class-validator';
import { IsCalendarDate, IsClockTime } from './calendar-date.validator';

/** The schema's `ScheduleBlockKind` as a closed set (D15-5). */
export const SCHEDULE_BLOCK_KINDS = ['BUSY', 'STUDY'] as const;
export type ScheduleBlockKindInput = (typeof SCHEDULE_BLOCK_KINDS)[number];

/** The schema's `EnergyLevel` as a closed set (EP13J D-J5). */
export const ENERGY_LEVELS = ['HIGH', 'NORMAL', 'LOW'] as const;
export type EnergyLevelInput = (typeof ENERGY_LEVELS)[number];

/**
 * Body accepted by `POST /schedule/blocks` (EP15B; contracts.md § API).
 *
 * Per-field shape lives here for the global `FieldValidationPipe`
 * (whitelist + `forbidNonWhitelisted`, no implicit conversion — EP14B); the
 * service repeats every check (`validateSync`, defense in depth) and owns
 * the cross-field rules: `courseId`/`energy` only on `STUDY`, `endDate`
 * only with `weekdays` and `≥ startDate`, `startTime < endTime`,
 * `startTime < 24:00`, `endTime ≤ 24:00`, `title` trimmed to ≤ 60 (empty →
 * `null`), and course ownership (uniform 404). `userId` comes from the JWT
 * principal — never the body.
 */
export class CreateScheduleBlockDto {
  @IsIn(SCHEDULE_BLOCK_KINDS, { message: 'kind must be BUSY or STUDY' })
  kind!: ScheduleBlockKindInput;

  @IsOptional()
  @IsString({ message: 'title must be a string' })
  title?: string | null;

  @IsOptional()
  @IsString({ message: 'courseId must be a string' })
  courseId?: string | null;

  @IsOptional()
  @IsIn(ENERGY_LEVELS, { message: 'energy must be one of HIGH, NORMAL, LOW' })
  energy?: EnergyLevelInput | null;

  @IsCalendarDate('startDate')
  startDate!: string;

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

  @IsClockTime('startTime')
  startTime!: string;

  @IsClockTime('endTime')
  endTime!: string;
}
