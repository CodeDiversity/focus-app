import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Enforces a serialized-size cap on the preferences JSON bag (D106-5).
 *
 * The cap is 4096 bytes of serialized JSON — prevents storage abuse
 * through an open-ended JSON column. Measured as UTF-8 bytes (IR-106-02:
 * `String.length` counts UTF-16 code units, so a multi-byte-heavy bag
 * could store far more than 4096 bytes under the old check).
 */
@ValidatorConstraint({ name: 'isBoundedSize', async: false })
export class IsBoundedSizeValidator implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value === null || value === undefined) {
      return true; // @IsOptional handles the null case; this validator only runs for non-null values.
    }

    const serialized = JSON.stringify(value);
    return Buffer.byteLength(serialized, 'utf8') <= 4096;
  }

  defaultMessage(_validationArguments?: ValidationArguments): string {
    return 'preferences serialized size must not exceed 4096 bytes';
  }
}
