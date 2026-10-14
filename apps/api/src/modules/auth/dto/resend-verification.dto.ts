import { Transform } from 'class-transformer';
import { IsEmail, IsString } from 'class-validator';

export class ResendVerificationDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString({ message: 'Please enter a valid email address' })
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email!: string;
}
