import { Transform } from 'class-transformer';
import {
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateBy,
} from 'class-validator';

/**
 * Query accepted by `GET /assignments` (SP-122A, D122-2…5).
 *
 * All fields are optional and AND-combined. The global `FieldValidationPipe`
 * (whitelist + `forbidNonWhitelisted`) rejects unknown query parameters with
 * a 400 field error — `userId` is therefore never accepted.
 *
 * `@Transform` preserves the raw query value so the global pipe's implicit
 * conversion cannot coerce a numeric `courseId` or a non-string `q`.
 */
export class ListAssignmentsQueryDto {
  @Transform(({ obj, key }) => obj[key])
  @IsOptional()
  @IsString()
  courseId?: string;

  @Transform(({ obj, key }) => obj[key])
  @IsOptional()
  @IsIn(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'SUBMITTED', 'GRADED'])
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SUBMITTED' | 'GRADED';

  @Transform(({ obj, key }) => obj[key])
  @IsOptional()
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

  @Transform(({ obj, key }) => obj[key])
  @IsOptional()
  @IsIn(['HOMEWORK', 'PAPER', 'PROJECT', 'QUIZ', 'EXAM'])
  type?: 'HOMEWORK' | 'PAPER' | 'PROJECT' | 'QUIZ' | 'EXAM';

  @Transform(({ obj, key }) => obj[key])
  @IsOptional()
  @IsISO8601({ strict: true, strictSeparator: true })
  @Matches(/T\d{2}:\d{2}/, { message: 'dueFrom must be an ISO-8601 datetime' })
  @ValidateBy({
    name: 'persistableDatetime',
    validator: {
      validate: (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value)),
      defaultMessage: () => 'dueFrom must be a supported ISO-8601 datetime',
    },
  })
  dueFrom?: string;

  @Transform(({ obj, key }) => obj[key])
  @IsOptional()
  @IsISO8601({ strict: true, strictSeparator: true })
  @Matches(/T\d{2}:\d{2}/, { message: 'dueTo must be an ISO-8601 datetime' })
  @ValidateBy({
    name: 'persistableDatetime',
    validator: {
      validate: (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value)),
      defaultMessage: () => 'dueTo must be a supported ISO-8601 datetime',
    },
  })
  dueTo?: string;

  @Transform(({ obj, key }) => obj[key])
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @Transform(({ obj, key }) => obj[key])
  @IsOptional()
  @IsIn(['dueDate', 'title', 'priority', 'status', 'createdAt', 'updatedAt'])
  sort?: 'dueDate' | 'title' | 'priority' | 'status' | 'createdAt' | 'updatedAt';

  @Transform(({ obj, key }) => obj[key])
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';
}
