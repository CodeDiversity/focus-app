import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ForgotPasswordDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsNotEmpty({ message: 'Please enter a valid email address' })
  @IsString({ message: 'Please enter a valid email address' })
  @IsEmail({}, { message: 'Please enter a valid email address' })
  @MaxLength(254, { message: 'Please enter a valid email address' })
  email!: string;
}
