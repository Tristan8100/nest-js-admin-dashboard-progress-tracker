import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class LeaderboardQueryDto {
  @ApiPropertyOptional({
    description: 'Only include activity on/after this date (inclusive)',
    example: '2026-08-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Only include activity on/before this date (inclusive)',
    example: '2026-08-27',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}