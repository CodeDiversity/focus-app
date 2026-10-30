import { IsArray, IsNotEmpty, IsString, Matches, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

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
