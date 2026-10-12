import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class RegisterDto {
  // Values are assigned by the validation pipe from the request body,
  // never via a constructor — hence the definite assignment assertions.
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password!: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;
}
