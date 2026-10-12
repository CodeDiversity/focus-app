import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  // Values are assigned programmatically (e.g. by AuthService.register),
  // never via a constructor — hence the definite assignment assertions.
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  passwordHash!: string;

  @IsString()
  firstName?: string;

  @IsString()
  lastName?: string;
}
