import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Custom validator for IANA time zone identifiers (D106-4).
 *
 * Uses `Intl.DateTimeFormat` construction as the acceptance test — Node ≥ 13
 * ships full ICU.  Invalid identifiers throw; valid ones pass silently.
 *
 * Mirrors the web helper `isValidTimeZone` in `apps/web/src/utils/datetime.ts`.
 */
@ValidatorConstraint({ name: 'isIanaTimeZone', async: false })
export class IsIanaTimeZone implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string' || value.length === 0) {
      return false;
    }

    try {
      new Intl.DateTimeFormat('en-US', { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }

  defaultMessage(_validationArguments?: ValidationArguments): string {
    return 'timeZone must be a valid IANA time zone, e.g. America/New_York';
  }
}
