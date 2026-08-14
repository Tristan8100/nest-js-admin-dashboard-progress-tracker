import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length, MinLength } from 'class-validator';

export class SendOtpDto{
    @ApiProperty({
        description: 'The email address to send the OTP to.',
        example: 'john.doe@example.com',
    })
    @IsNotEmpty()
    @IsEmail()
    email: string;
}

export class VerifyEmailDto{
    @ApiProperty({
        description: 'The email address of the user being verified.',
        example: 'john.doe@example.com',
    })
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @ApiProperty({
        description: "The 6-digit One-Time Password (OTP) sent to the user's email.",
        example: '123456',
    })
    @IsNotEmpty()
    @IsString()
    @Length(6, 6)
    otp: string;
}

export class VetifyCodeDto{
    @ApiProperty({
        description: 'The email address of the user being verified.',
        example: 'john.doe@example.com',
    })
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @ApiProperty({
        description: "The 6-digit One-Time Password (OTP) sent to the user's email.",
        example: '123456',
    })
    @IsNotEmpty()
    @IsString()
    @Length(6, 6)
    otp: string;
}

export class ResetPasswordDto{
    @ApiProperty({
        description: 'The email address associated with the password reset.',
        example: 'john.doe@example.com',
    })
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @ApiProperty({
        description: 'The temporary token received after verifying the password reset OTP.',
        example: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
    })
    @IsNotEmpty()
    @IsString()
    token: string;

    @ApiProperty({
        description: 'The new password for the user account. Must be at least 8 characters long.',
        example: 'newSecurePassword456',
        minLength: 8,
    })
    @IsNotEmpty()
    @IsString()
    @MinLength(8)
    password: string;
}