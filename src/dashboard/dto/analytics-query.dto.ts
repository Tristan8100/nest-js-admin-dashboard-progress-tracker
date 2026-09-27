import { Type, Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Min,
  IsBoolean,
} from 'class-validator';

export class AnalyticsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  gradeLevel?: number;

  @IsOptional()
  @IsString()
  section?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  batch?: number;

  @IsOptional()
  @Transform(({ value }) => (value === 'true' || value === true))
  @IsBoolean()
  active?: boolean;
}