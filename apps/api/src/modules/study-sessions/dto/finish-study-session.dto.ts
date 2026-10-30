import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class FinishStudySessionDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  confirmedMinutes?: number | null;
}
