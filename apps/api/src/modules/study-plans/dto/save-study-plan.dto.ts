import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/** EP13G (D13-4 option b) — the accepted `anchor` values. */
export const PLANNED_SESSION_ANCHORS = ['FIXED', 'FLEX_DAY'] as const;

/** EP13G — the accepted `windowHint` values (flex sessions only). */
export const PART_OF_DAY_VALUES = ['MORNING', 'AFTERNOON', 'EVENING'] as const;

export class SaveStudyPlanSessionDto {
  @IsString()
  @IsNotEmpty({ message: 'assignmentId is required' })
  assignmentId!: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date!: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'startTime must be HH:mm' })
  startTime!: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'endTime must be HH:mm' })
  endTime!: string;

  /**
   * EP13G — how this session relates to the clock. Omitted means `FIXED`:
   * a client written before EP13G keeps its exact clock-commitment
   * semantics, and a session the student drops on a clock slot is a
   * commitment by construction.
   */
  @IsOptional()
  @IsIn(PLANNED_SESSION_ANCHORS, { message: 'anchor must be FIXED or FLEX_DAY' })
  anchor?: 'FIXED' | 'FLEX_DAY';

  /**
   * EP13G — an honest part-of-day suggestion. Only meaningful on a flex
   * session; the service rejects a hint on a fixed one (a clock slot
   * already says when).
   */
  @IsOptional()
  @IsIn(PART_OF_DAY_VALUES, {
    message: 'windowHint must be MORNING, AFTERNOON or EVENING',
  })
  windowHint?: 'MORNING' | 'AFTERNOON' | 'EVENING';
}

export class SaveStudyPlanDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'from must be YYYY-MM-DD' })
  from!: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'to must be YYYY-MM-DD' })
  to!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaveStudyPlanSessionDto)
  sessions!: SaveStudyPlanSessionDto[];
}
