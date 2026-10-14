import { IsString, Matches } from 'class-validator';
import { INVALID_VERIFICATION_MESSAGE } from '../email-verification.service';

export class VerifyEmailDto {
  @IsString({ message: INVALID_VERIFICATION_MESSAGE })
  @Matches(/^[A-Za-z0-9_-]{43}$/, { message: INVALID_VERIFICATION_MESSAGE })
  token!: string;
}
