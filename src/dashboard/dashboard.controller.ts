import {
  Controller,
  Get,
} from '@nestjs/common';

import {
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { DashboardService } from './dashboard.service';

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
  getAnalytics() {
    return this.dashboardService.getAnalytics();
  }
}