import {
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
  ValidateBy,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { INVALID_RESET_MESSAGE } from '../password-reset.service';

/**
 * Cross-field validator: the decorated string must equal another field on
 * the same object. `class-validator` 0.14 removed the old `matchesProperty`
 * helper, so the constraint is declared inline (same semantics as the
 * classic `@MatchesProperty`).
 */
function matchesField(field: string, validationOptions?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    {
      name: 'matchesField',
      constraints: [field],
      async: false,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const related = (args.object as Record<string, unknown>)[field];
          return typeof value === 'string' && typeof related === 'string' && value === related;
        },
      },
    },
    validationOptions
  );
}

/**
 * Body for `POST /auth/reset-password` (SP-105B).
 *
 * Token failures — missing, empty, or anything that is not a 43-character
 * base64url value — all carry the *uniform invalid-link message*: the
 * response must never distinguish a malformed link from an unknown, used,
 * or expired one (SP-105 AC5). Password/confirmation failures are field
 * errors instead: a weak or mismatched password must never reveal whether
 * the token itself is valid (SP-105B AC4).
 *
 * The global pipe applies `whitelist` + `forbidNonWhitelisted`, so extra
 * owner/family identifiers in the body are rejected before the service
 * runs. The token is trimmed; the password is taken exactly as sent.
 */
export class ResetPasswordDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: INVALID_RESET_MESSAGE })
  @IsNotEmpty({ message: INVALID_RESET_MESSAGE })
  @Matches(/^[A-Za-z0-9_-]{43}$/, { message: INVALID_RESET_MESSAGE })
  token!: string;

  @IsString({ message: 'Password must be at least 8 characters' })
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password!: string;

  @IsString({ message: 'Passwords do not match' })
  @matchesField('password', { message: 'Passwords do not match' })
  confirmPassword!: string;
}
