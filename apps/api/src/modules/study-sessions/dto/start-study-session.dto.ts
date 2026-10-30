import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class StartStudySessionDto {
  @IsOptional()
  @IsUUID()
  assignmentId?: string | null;

  @IsOptional()
  @IsUUID()
  taskId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(480)
  plannedMinutes?: number | null;
}
