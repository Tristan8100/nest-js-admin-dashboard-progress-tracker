import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class UpdateProgressDto {
  @ApiProperty({
    description: 'The updated score for the level',
    example: 1000,
  })
  @IsNumber()
  @Min(0)
  score: number;
}