import { IsInt, IsString, Max, Matches, Min } from 'class-validator';

/**
 * Body accepted by POST /courses/:id/meetings (SP-112A).
 *
 * The global `FieldValidationPipe` (whitelist + `forbidNonWhitelisted`)
 * rejects unknown fields (a `userId`/`courseId` field included) with a 400 —
 * the controller declares this class as the `@Body()` metatype so the pipe
 * applies.  The service repeats every check as defense in depth (backend
 * authoritative) and owns the cross-field rule (`endTime` strictly after
 * `startTime`) plus the hour/minute bounds, which a single-field decorator
 * cannot express.
 *
 * Field rules (shared API contract, SP-112 README): `dayOfWeek` integer 0–6
 * (Sunday=0 … Saturday=6, D112-1); `startTime`/`endTime` `HH:mm` 24-hour
 * strings.  `:id`/`:meetingId` come from the route params — never the body.
 */
export class CreateClassMeetingDto {
  @IsInt({ message: 'dayOfWeek must be an integer' })
  @Min(0, { message: 'dayOfWeek must be between 0 (Sunday) and 6 (Saturday)' })
  @Max(6, { message: 'dayOfWeek must be between 0 (Sunday) and 6 (Saturday)' })
  dayOfWeek: number;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, {
    message: 'startTime must be a 24-hour HH:mm time (e.g. 09:00)',
  })
  startTime: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, {
    message: 'endTime must be a 24-hour HH:mm time (e.g. 10:30)',
  })
  endTime: string;
}
