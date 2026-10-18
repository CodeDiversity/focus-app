import { IsString, IsNotEmpty, IsOptional, Validate } from 'class-validator';
import { IsIanaTimeZone } from './validate-iana-time-zone.validator';
import { IsPlainObjectValidator } from './validate-plain-object.validator';
import { IsBoundedSizeValidator } from './validate-bounded-size.validator';

export class UpdateUserDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  @Validate(IsIanaTimeZone)
  timeZone?: string;

  @IsOptional()
  @Validate(IsPlainObjectValidator)
  @Validate(IsBoundedSizeValidator)
  preferences?: Record<string, unknown>;
}
