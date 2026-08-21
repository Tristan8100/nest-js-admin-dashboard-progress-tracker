import { Controller, Body, Post, Get, Request } from '@nestjs/common';
import { SignInDto } from './dto/sign-in-dto';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { UseGuards } from '@nestjs/common';
import { ResetPasswordDto, SendOtpDto, VerifyEmailDto } from './dto/send-otp-dto';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { Role, RolesGuard } from './auth.user';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Authentication')
@Controller('api')
export class AuthController {
    constructor(private authService: AuthService) {}

    @ApiOperation({ summary: 'User Sign In' })
    @Post('login')
    signIn(@Body() signInDto:SignInDto) {
       const val = this.authService.signIn(signInDto.password, signInDto.email, signInDto.username);
       return val;
    }

    @ApiBearerAuth()
    @ApiOperation({ summary: 'Access a protected resource' })
    @UseGuards(AuthGuard)
    @Get('protected')
    getProtectedResource(@Request() req) {
        return { message: 'This is a protected resource', user: req.user };
    }

    @ApiBearerAuth()
    @ApiOperation({ summary: 'Access a protected resource for users' })
    @UseGuards(AuthGuard, RolesGuard) // for roles
    @Role('user') // specify roles that can access this route
    @Get('protected-users')
    getUserProtectedResource(@Request() req) {
        return { message: 'This is a protected resource for users', user: req.user };
    }

    @ApiBearerAuth()
    @ApiOperation({ summary: 'Access a protected resource for users' })
    @UseGuards(AuthGuard, RolesGuard) // for roles
    @Role('admin') // specify roles that can access this route
    @Get('protected-admin')
    getAdminProtectedResource(@Request() req) {
        return { message: 'This is a protected resource for admin', user: req.user };
    }

    @ApiOperation({ summary: 'Register a new user' })
    @Post('register')
    register(@Body() registerDto: CreateUserDto) {
        const val = this.authService.register(registerDto);
        return val;
    }

    @ApiOperation({ summary: 'Send OTP to a user\'s email for verification' })
    @Post('send-otp')
    sendOtp(@Body() data : SendOtpDto) {
        const val = this.authService.sendOtp(data);
        return val;
    }

    @ApiOperation({ summary: 'Verify user email with OTP' })
    @Post('verify-otp')
    verifyEmail(@Body() data : VerifyEmailDto) {
        const val = this.authService.verifyEmail(data.email, data.otp);
        return val;
    }

    @ApiOperation({ summary: 'Request a password reset link (sends OTP)' })
    @Post('forgot-password')
    resetLink(@Body() data : SendOtpDto) {
        const val = this.authService.resetLink(data);
        return val;
    }

    @ApiOperation({ summary: 'Verify the password reset OTP' })
    @Post('forgot-password-token')
    verifyResetCode(@Body() data : VerifyEmailDto) {
        const val = this.authService.verifyResetCode(data);
        return val;
    }

    @ApiOperation({ summary: 'Reset user password with temporary token' })
    @Post('reset-password')
    resetPassword(@Body() data : ResetPasswordDto) {
        const val = this.authService.resetPassword(data);
        return val;
    }

    @ApiOperation({ summary: 'Get current authenticated user details' })
    @ApiBearerAuth()
    @UseGuards(AuthGuard, RolesGuard) // for roles
    @Role('user', 'admin') // specify roles that can access this route
    @Get('verify-user')
    setUser(@Request() req) {
        return this.authService.user(req.user);
    }
}

