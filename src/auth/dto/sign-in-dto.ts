import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class SignInDto {
    @ApiProperty({
        description: 'The email address of the user for signing in.',
        example: 'john.doe@example.com',
    })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({
        description: 'The password for the user account.',
        example: 'password123',
    })
    @IsNotEmpty()
    @IsString()
    password: string;
}