import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Rejects top-level arrays, strings, numbers, null, and undefined —
 * only plain objects (created via `{}` or `Object.create(null)`) pass.
 *
 * `@IsObject()` from class-validator passes arrays, so this is needed
 * to enforce the "plain JSON object" requirement (D106-5).
 */
@ValidatorConstraint({ name: 'isPlainObject', async: false })
export class IsPlainObjectValidator implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value);
  }

  defaultMessage(_validationArguments?: ValidationArguments): string {
    return 'preferences must be a plain object';
  }
}
