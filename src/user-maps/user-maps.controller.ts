import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { UserMapsService } from './user-maps.service';

import { CreateProgressDto } from './dto/create-progress.dto/create-progress.dto';
import { UpdateProgressDto } from './dto/update-progress.dto/update-progress.dto';

@ApiTags('user-maps')
@Controller('users/:userId/maps')
export class UserMapsController {
  constructor(
    private readonly userMapsService: UserMapsService,
  ) {}

  // =========================
  // PROGRESS
  // =========================

  @Post(':rank/progress')
  @ApiOperation({
    summary: 'Save user progress',
  })
  @ApiParam({
    name: 'rank',
    example: 1,
  })
  @ApiBody({
    type: CreateProgressDto,
  })
  saveProgress(
    @Param('userId') userId: string,
    @Param('rank') rank: string,
    @Body() createProgressDto: CreateProgressDto,
  ) {
    return this.userMapsService.saveProgress(
      userId,
      Number(rank),
      createProgressDto,
    );
  }

  @Patch(':rank/progress/:level')
  @ApiOperation({
    summary: 'Update progress for a level',
  })
  @ApiParam({
    name: 'rank',
    example: 1,
  })
  @ApiParam({
    name: 'level',
    example: 1,
  })
  @ApiBody({
    type: UpdateProgressDto,
  })
  updateProgress(
    @Param('userId') userId: string,
    @Param('rank') rank: string,
    @Param('level') level: string,
    @Body() updateProgressDto: UpdateProgressDto,
  ) {
    return this.userMapsService.updateProgress(
      userId,
      Number(rank),
      Number(level),
      updateProgressDto.score,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Get all maps and progress for a user',
  })
  findAllUserMaps(
    @Param('userId') userId: string,
  ) {
    return this.userMapsService.findAllUserMaps(
      userId,
    );
  }

  @Get(':rank')
  @ApiOperation({
    summary: 'Get a user map',
  })
  @ApiParam({
    name: 'rank',
    example: 1,
  })
  findUserMap(
    @Param('userId') userId: string,
    @Param('rank') rank: string,
  ) {
    return this.userMapsService.findUserMap(
      userId,
      Number(rank),
    );
  }

  @Get(':rank/progress')
  @ApiOperation({
    summary: 'Get map progress',
  })
  @ApiParam({
    name: 'rank',
    example: 1,
  })
  findProgress(
    @Param('userId') userId: string,
    @Param('rank') rank: string,
  ) {
    return this.userMapsService.findProgress(
      userId,
      Number(rank),
    );
  }

  @Delete(':rank/progress/:level')
  @ApiOperation({
    summary: 'Delete level progress',
  })
  @ApiParam({
    name: 'rank',
    example: 1,
  })
  @ApiParam({
    name: 'level',
    example: 1,
  })
  deleteProgress(
    @Param('userId') userId: string,
    @Param('rank') rank: string,
    @Param('level') level: string,
  ) {
    return this.userMapsService.deleteProgress(
      userId,
      Number(rank),
      Number(level),
    );
  }
}