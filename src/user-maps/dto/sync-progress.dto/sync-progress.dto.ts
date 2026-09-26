import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray, IsInt, IsBoolean, IsOptional, ValidateNested, Min,
  IsString, IsNumber,
  IsNotEmpty,
} from 'class-validator';

export class LevelProgressDto {
  @ApiProperty({ example: 21 })
  @IsInt()
  @Min(0)
  levelIndex: number;

  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(0)
  stars: number;
}

export class TutorialProgressDto {
  @ApiProperty({ example: 9 })
  @IsInt()
  @Min(0)
  tutorialIndex: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  finished: boolean;
}

export class KnowledgeCheckProgressDto {
  @ApiProperty({ example: 4 })
  @IsInt()
  @Min(0)
  checkIndex: number;

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(0)
  score: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  finished: boolean;
}

export class CurrentProgressDto {
  @ApiProperty({ required: false, description: 'Progress type: none, level, tutorial, or knowledgecheck.' })
  @IsOptional()
  @IsString()
  progressType?: string;

  @ApiProperty({ required: false, description: 'Game index for the current progress item; -1 means unset.' })
  @IsOptional()
  @IsInt()
  progressIndex?: number;

  @ApiProperty({ required: false, description: 'Score for the event; -1 means unset.' })
  @IsOptional()
  @IsInt()
  score?: number;

  @ApiProperty({ required: false, nullable: true, description: 'Optional client timestamp in ISO-8601 UTC format.' })
  @IsOptional()
  @IsString()
  clientTimestamp?: string | null;
}

export class SyncProgressDto {
  @ApiProperty({ type: [LevelProgressDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LevelProgressDto)
  levelProgress: LevelProgressDto[];

  @ApiProperty({ type: [TutorialProgressDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TutorialProgressDto)
  tutorialProgress: TutorialProgressDto[];

  @ApiProperty({ type: [KnowledgeCheckProgressDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KnowledgeCheckProgressDto)
  knowledgeCheckProgress: KnowledgeCheckProgressDto[];

  @ApiProperty({ required: true, description: 'Important field since it validate the existing name on db and in' })
  @IsString()
  @IsNotEmpty()
  username: string; //actual name on db, doesn't change since it's the game original field.

  @ApiProperty({ required: false, type: CurrentProgressDto, nullable: true, description: 'Optional current progress info from the game save call.' })
  @IsOptional()
  @ValidateNested()
  @Type(() => CurrentProgressDto)
  currentProgress?: CurrentProgressDto | null;

  // ===== Fields below are sent by the game but not used by this endpoint. =====
  // ===== Declared here only so validation doesn't reject/strip the payload. =====

  @ApiProperty({ required: false, description: 'Not used by this endpoint — local save slot number.' })
  @IsOptional()
  @IsInt()
  slot?: number;

  @ApiProperty({ required: false, description: 'Not used by this endpoint.' })
  @IsOptional()
  @IsBoolean()
  userCreated?: boolean;

  @ApiProperty({ required: false, description: 'Not used by this endpoint — local avatar setting.' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiProperty({ required: false, description: 'Not used by this endpoint — local running star total.' })
  @IsOptional()
  @IsNumber()
  stars?: number;

  @ApiProperty({ required: false, description: 'Not used by this endpoint — local unlock counter.' })
  @IsOptional()
  @IsInt()
  unlockedLevels?: number;

  @ApiProperty({ required: false, description: 'Not used by this endpoint — local unlock counter.' })
  @IsOptional()
  @IsInt()
  unlockedTutorials?: number;

  @ApiProperty({ required: false, description: 'Not used by this endpoint — local unlock counter.' })
  @IsOptional()
  @IsInt()
  unlockedKnowledgeChecks?: number;

  @ApiProperty({ required: false, description: 'Not used by this endpoint — local shop data, never synced.' })
  @IsOptional()
  @IsArray()
  purchasedAvatars?: string[];

  @ApiProperty({ required: false, description: 'Not used by this endpoint — local shop data, never synced.' })
  @IsOptional()
  @IsString()
  equippedAvatar?: string;
}