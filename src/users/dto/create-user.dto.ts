import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsNumber, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    description: 'The email address of the user.',
    example: 'john.doe@example.com',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'The name of the user.',
    example: 'John Doe',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'The username of the user. Must be unique.',
    example: 'johndoe123',
  })
  @IsNotEmpty()
  @IsString()
  username: string;

  @ApiProperty({
    description: 'The grade level of the user.',
    example: 3,
  })
  @IsNotEmpty()
  @IsNumber()
  gradeLevel: number;

  @ApiProperty({
    description: 'The section of the user.',
    example: 'A',
  })
  @IsNotEmpty()
  @IsString()
  section: string;

  @ApiProperty({
    description: 'The password for the user account. Must be at least 8 characters long.',
    example: 'password123',
    minLength: 8,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;
}
