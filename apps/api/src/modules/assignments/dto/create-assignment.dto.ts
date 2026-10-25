import { Transform } from 'class-transformer';
import {
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  ValidateBy,
} from 'class-validator';

/** POST /assignments (D113-1…5). Null optional values mean omitted.
 * Preserve raw types despite the global pipe's implicit conversion: numeric
 * strings are not numbers, and a numeric title is not a title.
 * courseId is not UUID-validated: missing/malformed/foreign IDs share a 404.
 */
export class CreateAssignmentDto {
  @Transform(({ obj, key }) => obj[key])
  @IsString()
  @Matches(/\S/, { message: 'title must not be empty' })
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  courseId?: string | null;

  @IsOptional()
  @IsISO8601({ strict: true, strictSeparator: true })
  @Matches(/T\d{2}:\d{2}/, { message: 'dueDate must be an ISO-8601 datetime' })
  @ValidateBy({
    name: 'persistableDatetime',
    validator: {
      validate: (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value)),
      defaultMessage: () => 'dueDate must be a supported ISO-8601 datetime',
    },
  })
  dueDate?: string | null;

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  @Max(1000)
  estimatedHours?: number | null;

  @IsOptional()
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | null;

  // SP-115G (D115-1): the five stored identifiers, not display copy; any
  // other value (e.g. `ESSAY`) is a 400 field error on `type`.
  @IsOptional()
  @IsIn(['HOMEWORK', 'PAPER', 'PROJECT', 'QUIZ', 'EXAM'])
  type?: 'HOMEWORK' | 'PAPER' | 'PROJECT' | 'QUIZ' | 'EXAM' | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;
}
