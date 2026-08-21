import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { UserMapsService } from './user-maps.service';

import { CreateProgressDto } from './dto/create-progress.dto/create-progress.dto';
import { UpdateProgressDto } from './dto/update-progress.dto/update-progress.dto';

import { AuthGuard } from 'src/auth/auth.guard';
import { Role, RolesGuard } from 'src/auth/auth.user';

@ApiTags('user-maps')
@Controller('')
export class UserMapsController {
  constructor(
    private readonly userMapsService: UserMapsService,
  ) {}

  // =========================
  // MY PROGRESS
  // =========================

  @Get('user-maps/my-progress')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Role('user')
  @ApiOperation({
    summary: 'Get my maps and progress',
  })
  findMyProgress(@Request() req) {
    return this.userMapsService.findAllUserMaps(
      req.user.id,
    );
  }

  // =========================
  // PROGRESS
  // =========================

  @Post('users/:userId/maps/:rank/progress')
  @ApiOperation({
    summary: 'Save user progress',
  })
  @ApiParam({
    name: 'userId',
    example: '6a85b10250dc57defd99b78e',
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

  @Patch(
    'users/:userId/maps/:rank/progress/:level',
  )
  @ApiOperation({
    summary: 'Update progress for a level',
  })
  @ApiParam({
    name: 'userId',
    example: '6a85b10250dc57defd99b78e',
  })
  @ApiParam({
    name: 'rank',
    example: 1,
  })
  @ApiParam({
    name: 'level',
    example: 1,
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

  // =========================
  // MAPS
  // =========================

  @Get('users/:userId/maps')
  @ApiOperation({
    summary: 'Get all maps and progress for a user',
  })
  @ApiParam({
    name: 'userId',
    example: '6a85b10250dc57defd99b78e',
  })
  findAllUserMaps(
    @Param('userId') userId: string,
  ) {
    return this.userMapsService.findAllUserMaps(
      userId,
    );
  }

  @Get('users/:userId/maps/:rank')
  @ApiOperation({
    summary: 'Get a user map',
  })
  @ApiParam({
    name: 'userId',
    example: '6a85b10250dc57defd99b78e',
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

  @Get('users/:userId/maps/:rank/progress')
  @ApiOperation({
    summary: 'Get map progress',
  })
  @ApiParam({
    name: 'userId',
    example: '6a85b10250dc57defd99b78e',
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

  // =========================
  // DELETE PROGRESS
  // =========================

  @Delete(
    'users/:userId/maps/:rank/progress/:level',
  )
  @ApiOperation({
    summary: 'Delete level progress',
  })
  @ApiParam({
    name: 'userId',
    example: '6a85b10250dc57defd99b78e',
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