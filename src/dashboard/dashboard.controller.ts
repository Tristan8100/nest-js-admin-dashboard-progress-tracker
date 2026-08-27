import {
  Controller,
  Get,
  Query,
} from '@nestjs/common';

import {
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { DashboardService } from './dashboard.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { LeaderboardQueryDto } from './dto/leaderbord-query.dto';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get teacher dashboard data',
    description:
      'Returns an overview of students, progress, and other data used by the teacher dashboard.',
  })
  @ApiResponse({
    status: 200,
    description: 'Teacher dashboard data retrieved successfully.',
  })
  getDashboard() {
    return this.dashboardService.getDashboard();
  }

  @Get('analytics')
  @ApiOperation({
    summary: 'Get teacher analytics',
    description:
      'Returns aggregated student and progress analytics for the teacher analytics page.',
  })
  @ApiResponse({
    status: 200,
    description: 'Teacher analytics retrieved successfully.',
  })
  @Get('analytics')
  @ApiOperation({
    summary: 'Get teacher analytics',
  })
  @ApiQuery({
    name: 'gradeLevel',
    required: false,
    example: 3,
  })
  @ApiQuery({
    name: 'section',
    required: false,
    example: 'A',
  })
  getAnalytics(
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.dashboardService.getAnalytics(query);
  }

  @Get('leaderboard')
  @ApiOperation({
    summary: 'Get teacher leaderboard',
    description:
      'Returns a list of students ranked by their progress and performance.',
  })
  @ApiResponse({
    status: 200,
    description: 'Teacher leaderboard retrieved successfully.',
  })
  getLeaderboard(@Query() query: LeaderboardQueryDto) {
    return this.dashboardService.getLeaderboard(query);
  }


}