import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  // Values are assigned by the validation pipe from the request body,
  // never via a constructor — hence the definite assignment assertions.
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}
