import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { UsersService } from './users.service';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RegisterStudentDto } from './dto/register-student.dto';
import { UserQueryDto } from './dto/user-query.dto';

import { AuthGuard } from 'src/auth/auth.guard';
import { Role, RolesGuard } from 'src/auth/auth.user';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  // =========================
  // CREATE
  // =========================

  @Post()
  @ApiOperation({
    summary: 'Create a new user',
  })
  create(
    @Body() createUserDto: CreateUserDto,
  ) {
    return this.usersService.create(createUserDto);
  }

  @Post('register-student')
  @UseGuards(AuthGuard, RolesGuard)
  @Role('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Register a new student account',
  })
  registerStudent(
    @Body() dto: RegisterStudentDto,
  ) {
    return this.usersService.registerStudent(dto);
  }

  // =========================
  // GET
  // =========================

  @Get()
  @ApiOperation({
    summary: 'Get all users',
  })
  @ApiResponse({
    status: 200,
    description: 'Return all users.',
  })
  findAll() {
    return this.usersService.findAll();
  }

  @Get('students')
  @ApiOperation({
    summary: 'Get all students',
  })
  findStudents(
    @Query() query: UserQueryDto,
  ) {
    return this.usersService.findStudents(query);
  }

  @Get('find-my-profile')
  @UseGuards(AuthGuard, RolesGuard)
  @Role('user', 'admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get my profile',
  })
  @ApiResponse({
    status: 200,
    description: 'Return the authenticated user profile.',
  })
  findMyProfile(
    @Request() req,
  ) {
    return this.usersService.findOne(
      req.user.id,
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a user by ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Return the user.',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found.',
  })
  findOne(
    @Param('id') id: string,
  ) {
    return this.usersService.findOne(id);
  }

  // =========================
  // UPDATE
  // =========================

  @Patch('update-my-profile')
  @UseGuards(AuthGuard, RolesGuard)
  @Role('user', 'admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update my profile',
  })
  @ApiResponse({
    status: 200,
    description: 'The user profile has been successfully updated.',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found.',
  })
  updateMyProfile(
    @Request() req,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(
      req.user.id,
      updateUserDto,
    );
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a user',
  })
  @ApiResponse({
    status: 200,
    description: 'The user has been successfully updated.',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found.',
  })
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(
      id,
      updateUserDto,
    );
  }

  // =========================
  // DELETE
  // =========================

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a user',
  })
  @ApiResponse({
    status: 200,
    description: 'The user has been successfully deleted.',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found.',
  })
  remove(
    @Param('id') id: string,
  ) {
    return this.usersService.remove(id);
  }
}