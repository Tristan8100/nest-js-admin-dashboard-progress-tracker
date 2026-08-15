import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsString,
  Min,
} from 'class-validator';

export class CreateUserMapDto {
  @ApiProperty({
    description: 'The static ID of the map',
    example: 1,
  })
  @IsNumber()
  @Min(1)
  map_id: number;

  @ApiProperty({
    description: 'The name of the map',
    example: 'Forest of Beginnings',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'The rank/order of the map',
    example: 1,
  })
  @IsNumber()
  @Min(1)
  rank: number;
}