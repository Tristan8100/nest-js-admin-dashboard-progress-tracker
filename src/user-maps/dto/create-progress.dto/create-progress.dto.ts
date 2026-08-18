import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export enum ProgressType {
  LEVEL = 'level',
  TUTORIAL = 'tutorial',
  KNOWLEDGE_CHECK = 'knowledge_check',
}

export class CreateProgressDto {
  @ApiProperty({
    description:
      'The name of the map this progress belongs to (used to look up the UserMap, since Unity has no map _id to reference)',
    example: 'materials',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'The type of progress entry',
    enum: ProgressType,
    example: ProgressType.LEVEL,
  })
  @IsEnum(ProgressType)
  type: ProgressType;

  @ApiProperty({
    description:
      'The index of the item within its type (level index, tutorial index, or knowledge check index)',
    example: 3,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  level: number;

  @ApiProperty({
    description:
      'Score for this entry (stars for level, correct answers for knowledge_check). Omit for tutorial.',
    example: 3,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  score?: number;
}