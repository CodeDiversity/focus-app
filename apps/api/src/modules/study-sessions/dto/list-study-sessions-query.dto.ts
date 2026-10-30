import { Transform } from 'class-transformer';
import { IsInt, IsISO8601, IsOptional, IsString, Max, Min, ValidateBy } from 'class-validator';

export class ListStudySessionsQueryDto {
  @Transform(({ obj, key }) => (obj[key] === '' ? undefined : obj[key]))
  @IsOptional()
  @IsString()
  assignmentId?: string;

  @Transform(({ obj, key }) => obj[key])
  @IsOptional()
  @IsISO8601()
  @ValidateBy({
    name: 'persistableDatetime',
    validator: {
      validate: (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value)),
      defaultMessage: () => 'from must be a supported ISO-8601 date',
    },
  })
  from?: string;

  @Transform(({ obj, key }) => obj[key])
  @IsOptional()
  @IsISO8601()
  @ValidateBy({
    name: 'persistableDatetime',
    validator: {
      validate: (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value)),
      defaultMessage: () => 'to must be a supported ISO-8601 date',
    },
  })
  to?: string;

  @Transform(({ obj, key }) =>
    obj[key] === '' || obj[key] === undefined ? undefined : Number(obj[key])
  )
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @Transform(({ obj, key }) =>
    obj[key] === '' || obj[key] === undefined ? undefined : Number(obj[key])
  )
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}
