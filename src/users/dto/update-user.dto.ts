
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'The updated email address of the user.',
    example: 'jonathan.doe@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'The updated name of the user.',
    example: 'Jonathan Doe',
  })
  @IsOptional()
  @IsString()
  name?: string;

  // @ApiPropertyOptional({
  //   description: 'The updated username of the user. Must be unique.',
  //   example: 'johndoe123',
  // })
  // @IsOptional()
  // @IsString()
  // username?: string;

  @ApiPropertyOptional({
    description: 'The updated password for the user account. Must be at least 8 characters long.',
    example: 'newStrongPassword123',
    minLength: 8,
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}
