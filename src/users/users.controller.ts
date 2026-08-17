import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RegisterStudentDto } from './dto/register-student.dto';
import { RolesGuard } from 'src/auth/auth.user';
import { AuthGuard } from 'src/auth/auth.guard';
import { UseGuards } from '@nestjs/common';
import { Role } from 'src/auth/auth.user';

// For a real-world application, these endpoints should be protected, for example, with a guard that checks for an Admin role.
// @ApiBearerAuth()
// @UseGuards(AuthGuard, RolesGuard)
@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Create a new user (Note: use /api/register for public registration)' })
  @ApiResponse({ status: 201, description: 'The user has been successfully created.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Post('register-student')
  @UseGuards(AuthGuard, RolesGuard)
  @Role('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Register a new student account (teacher only)',
    description:
      'Creates a student account with a permanent username and a resettable password. ' +
      'Only accessible by an authenticated teacher.',
  })
  @ApiResponse({ status: 201, description: 'Student account created successfully.' })
  @ApiResponse({ status: 409, description: 'Username already taken.' })
  @ApiResponse({ status: 401, description: 'Unauthorized: must be logged in as a teacher.' })
  registerStudent(@Body() dto: RegisterStudentDto) {
    return this.usersService.registerStudent(dto);
  }

  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'Return all users.' })
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiResponse({ status: 200, description: 'Return the user.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @ApiOperation({ summary: 'Update a user' })
  @ApiResponse({ status: 200, description: 'The user has been successfully updated.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @ApiOperation({ summary: 'Delete a user' })
  @ApiResponse({ status: 200, description: 'The user has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
