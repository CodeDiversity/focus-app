import { applyDecorators } from '@nestjs/common';
import { IsString, Matches, ValidateBy } from 'class-validator';
import { parseCalendarDate } from '../../../common/lib/calendar-date';

/**
 * Strict `YYYY-MM-DD` calendar-date field (EP15B; the
 * `list-calendar-events-query.dto.ts` pattern made reusable): a string, in
 * shape, and a real date (`2026-02-30` is rejected). The message names the
 * field so the 400 is actionable (DoD-4).
 */
export function IsCalendarDate(field: string): PropertyDecorator {
  return applyDecorators(
    IsString({ message: `${field} must be a string` }),
    Matches(/^\d{4}-\d{2}-\d{2}$/, { message: `${field} must be a YYYY-MM-DD date` }),
    ValidateBy({
      name: 'validCalendarDate',
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' && parseCalendarDate(value) !== null,
        defaultMessage: () => `${field} must be a valid calendar date`,
      },
    })
  );
}

/** `HH:mm` field shape; the service owns the hour/minute bounds and the `24:00` rule. */
export function IsClockTime(field: string): PropertyDecorator {
  return applyDecorators(
    IsString({ message: `${field} must be a string` }),
    Matches(/^\d{2}:\d{2}$/, { message: `${field} must be a 24-hour HH:mm time (e.g. 09:00)` })
  );
}
