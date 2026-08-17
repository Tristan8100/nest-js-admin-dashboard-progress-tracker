import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength, Matches } from 'class-validator';

export class RegisterStudentDto {
  @ApiProperty({
    description: "The student's full name",
    example: 'Juan Dela Cruz',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Permanent username used by the student to log in',
    example: 'juandelacruz',
  })
  @IsString()
  @Matches(/^[a-zA-Z0-9_.]+$/, {
    message: 'username can only contain letters, numbers, underscores, and periods',
  })
  @MinLength(3)
  username: string;

  @ApiProperty({
    description: 'Initial password for the student. Can be reset later by the teacher.',
    example: 'user123',
  })
  @IsString()
  @MinLength(4)
  password: string;

  @ApiProperty({
    description: 'The section the student belongs to',
    example: 'Section A',
  })
  @IsString()
  section: string;

  @ApiProperty({
    description: "The student's grade level",
    example: 'Grade 3',
  })
  @IsString()
  gradeLevel: string;

  @ApiProperty({
    description: 'Optional email for the student (not required)',
    example: null,
    required: false,
  })
  @IsOptional()
  @IsString()
  email?: string;
}