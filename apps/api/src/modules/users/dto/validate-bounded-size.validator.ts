import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Enforces a serialized-size cap on the preferences JSON bag (D106-5).
 *
 * The cap is 4096 bytes of serialized JSON — prevents storage abuse
 * through an open-ended JSON column.
 */
@ValidatorConstraint({ name: 'isBoundedSize', async: false })
export class IsBoundedSizeValidator implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value === null || value === undefined) {
      return true; // @IsOptional handles the null case; this validator only runs for non-null values.
    }

    const serialized = JSON.stringify(value);
    return serialized.length <= 4096;
  }

  defaultMessage(_validationArguments?: ValidationArguments): string {
    return 'preferences serialized size must not exceed 4096 bytes';
  }
}
