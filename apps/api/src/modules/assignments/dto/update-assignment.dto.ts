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

/**
 * Body accepted by PATCH /assignments/:id (SP-114D, D114-1…5).
 *
 * Every field is optional — the request is a **partial merge**: an explicit
 * `null` is treated as omitted (the stored value is kept, D114-5), and
 * validation runs on the **merged** (post-patch) values in the service
 * (backend authoritative).  The global `FieldValidationPipe`
 * (whitelist + `forbidNonWhitelisted`) rejects unknown fields —
 * `actualHours`, `courseId`, `userId` (D114-2: lifecycle fields are not
 * editable here) — with a 400; the controller declares this class as the
 * `@Body()` metatype so the pipe applies.
 *
 * Field rules mirror `CreateAssignmentDto` (same contract) but apply only
 * when the field is present: `title` non-whitespace ≤ 200; `description`
 * ≤ 2000 (the only clearable field — `''` clears the stored description);
 * `dueDate` strict persistable ISO-8601 datetime; `estimatedHours`
 * `0 < h ≤ 1000`; `priority` the 4-value enum; `type` (SP-115G) the 5-value
 * enum; `status` (SP-121A, D121-2) the closed 5-value `AssignmentStatus`
 * enum — PATCH-only, create still starts `PENDING` (D121-1).
 *
 * `title` preserves its raw type despite the global pipe's implicit
 * conversion (the create DTO's F113A-2 fix): a numeric title is not a title.
 * The remaining optional fields are `| null` unions, whose emitted design
 * type is `Object` — class-transformer performs no conversion on them, so a
 * numeric string is not a number (the create DTO's note).
 */
export class UpdateAssignmentDto {
  @Transform(({ obj, key }) => obj[key])
  @IsOptional()
  @IsString()
  @Matches(/\S/, { message: 'title must not be empty' })
  @MaxLength(200)
  title?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

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

  // SP-115G (D115-3): an explicit `null` is treated as omitted by the
  // service's `has()` — the stored type is kept; there is no clear sentinel.
  @IsOptional()
  @IsIn(['HOMEWORK', 'PAPER', 'PROJECT', 'QUIZ', 'EXAM'])
  type?: 'HOMEWORK' | 'PAPER' | 'PROJECT' | 'QUIZ' | 'EXAM' | null;

  // SP-121A (D121-2/3): PATCH accepts the full closed enum; an explicit
  // `null` is treated as omitted by the service's `has()` — the stored
  // status is kept; a status-only body is a non-empty patch.
  @IsOptional()
  @IsIn(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'SUBMITTED', 'GRADED'])
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SUBMITTED' | 'GRADED' | null;
}
