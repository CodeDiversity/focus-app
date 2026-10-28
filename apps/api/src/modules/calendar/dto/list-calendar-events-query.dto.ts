import { Transform } from 'class-transformer';
import { IsString, Matches, ValidateBy } from 'class-validator';
import { parseCalendarDate } from '../../../common/lib/calendar-date';

/**
 * Query accepted by `GET /calendar/events` (SP-127A, D404-1).
 *
 * Only `from` and `to` are whitelisted; the global `FieldValidationPipe`
 * (whitelist + `forbidNonWhitelisted`) rejects `tz`, `courseId`, `userId`,
 * `includeArchived`, etc. with a 400 field error. The service re-checks the
 * range rules (order, 31-day cap) as defense in depth.
 *
 * `@Transform` preserves the raw query value so the global pipe's implicit
 * conversion cannot coerce a numeric `from`.
 */
export class ListCalendarEventsQueryDto {
  @Transform(({ obj, key }) => obj[key])
  @IsString({ message: 'from must be a string' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'from must be a YYYY-MM-DD date' })
  @ValidateBy({
    name: 'validCalendarDate',
    validator: {
      validate: (value: unknown) => typeof value === 'string' && parseCalendarDate(value) !== null,
      defaultMessage: () => 'from must be a valid calendar date',
    },
  })
  from!: string;

  @Transform(({ obj, key }) => obj[key])
  @IsString({ message: 'to must be a string' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'to must be a YYYY-MM-DD date' })
  @ValidateBy({
    name: 'validCalendarDate',
    validator: {
      validate: (value: unknown) => typeof value === 'string' && parseCalendarDate(value) !== null,
      defaultMessage: () => 'to must be a valid calendar date',
    },
  })
  to!: string;
}
