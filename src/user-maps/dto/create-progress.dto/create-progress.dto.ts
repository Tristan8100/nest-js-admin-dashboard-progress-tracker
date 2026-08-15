import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, Min } from 'class-validator';

export class CreateProgressDto {
  @ApiProperty({
    description: 'The name of the map',
    example: 'Forest of Beginnings',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'The completed level number',
    example: 1,
  })
  @IsNumber()
  @Min(1)
  level: number;

  @ApiProperty({
    description: 'The score achieved for the level',
    example: 950,
  })
  @IsNumber()
  @Min(0)
  score: number;
}