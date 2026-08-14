import {
  Injectable,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { User, UserDocument } from 'src/users/entities/user.entity';
import { EmailVerification, EmailVerificationDocument } from './entities/email-verification.entity';
import { PasswordReset, PasswordResetDocument } from './entities/password-reset.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { transporter } from '../../lib/transporter';
import { SendOtpDto, VetifyCodeDto, ResetPasswordDto } from './dto/send-otp-dto';
import crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name)
    private usersModel: Model<UserDocument>,
    @InjectModel(EmailVerification.name)
    private emailVerificationModel: Model<EmailVerificationDocument>,
    @InjectModel(PasswordReset.name)
    private passwordResetModel: Model<PasswordResetDocument>,
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  private async sendVerificationCode(email: string): Promise<string> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    let record = await this.emailVerificationModel.findOne({ email }).exec();

    if (record) {
      record.code = code;
      await record.save();
    } else {
      record = await this.emailVerificationModel.create({ email, code });
    }

    try {
      await transporter.sendMail({
        from: `"ECHOMIND" <${process.env.MAIL_FROM_ADDRESS}>`,
        to: email,
        subject: 'Your Echomind Verification Code',
        html: `<div>Your verification code is: <strong>${code}</strong></div>`,
      });
    } catch (err) {
      throw new ConflictException('Failed to send verification email');
    }

    return code;
  }

  async signIn(email: string, password: string): Promise<any> {
    const user = await this.usersModel.findOne({ email }).select('+password').exec();
    if (!user) throw new UnauthorizedException('User not found');

    if (!user.email_verified_at) {
      await this.sendVerificationCode(user.email);
      throw new ForbiddenException('Email not verified');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    const payload = { id: user._id.toString(), email: user.email };
    const token = this.jwtService.sign(payload);

    return {
      message: 'Login success',
      token,
      status: 'success',
      user_info: { id: user._id.toString(), name: user.name, email: user.email },
    };
  }

  async register(register: CreateUserDto): Promise<any> {
    const user = await this.usersService.create(register);
    const code = await this.sendVerificationCode(user.email);
    return { message: 'Registration success', email: user.email, code };
  }

  async sendOtp(sendOtpDto: SendOtpDto): Promise<any> {
    const user = await this.usersModel.findOne({ email: sendOtpDto.email }).exec();
    if (!user) throw new UnauthorizedException('User not found');
    if (user.email_verified_at) throw new UnauthorizedException('Email already verified');

    await this.sendVerificationCode(sendOtpDto.email);
    return { message: 'OTP sent successfully' };
  }

  async verifyEmail(email: string, code: string): Promise<any> {
    const record = await this.emailVerificationModel.findOne({ email, code }).exec();
    if (!record) throw new UnauthorizedException('Invalid verification code');

    const dbNow = Date.now();
    if (record.updated_at.getTime() + 10 * 60 * 1000 < dbNow) {
      throw new UnauthorizedException('Verification code expired');
    }

    await this.usersModel.updateOne({ email }, { email_verified_at: new Date() }).exec();
    await this.emailVerificationModel.deleteOne({ email }).exec();

    return { message: 'Email verified successfully' };
  }

  async resetLink(sendResetLink: SendOtpDto): Promise<any> {
    const email = sendResetLink.email;
    const user = await this.usersModel.findOne({ email }).exec();
    if (!user) throw new UnauthorizedException('User not found');

    let record = await this.passwordResetModel.findOne({ email }).exec();
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    if (record) {
      record.code = code;
      await record.save();
    } else {
      record = await this.passwordResetModel.create({ email, code });
    }

    await transporter.sendMail({
      from: `"ECHOMIND" <${process.env.MAIL_FROM_ADDRESS}>`,
      to: email,
      subject: 'Your Echomind Password Reset Code',
      html: `<div>Your password reset code is: <strong>${code}</strong></div>`,
    });

    return { message: 'Password reset link sent successfully' };
  }

  async verifyResetCode(data: VetifyCodeDto): Promise<any> {
    const { email, otp } = data;
    const record = await this.passwordResetModel.findOne({ email, code: otp }).exec();
    if (!record) throw new NotFoundException('Invalid reset code or email');

    const dbNow = Date.now();
    if (record.updated_at.getTime() + 10 * 60 * 1000 < dbNow) {
      throw new UnauthorizedException('Verification code expired');
    }

    const token = crypto.randomBytes(30).toString('hex');
    record.token = await bcrypt.hash(token, 10);
    await record.save();

    return { message: 'Reset code verified successfully', token };
  }

  async resetPassword(data: ResetPasswordDto): Promise<any> {
    const { email, token, password } = data;
    const record = await this.passwordResetModel.findOne({ email }).exec();
    if (!record) throw new NotFoundException('Invalid reset code or email');

    const isMatch = await bcrypt.compare(token, record.token);
    if (!isMatch) throw new UnauthorizedException('Invalid reset token');

    await this.usersModel.updateOne({ email }, { password: await bcrypt.hash(password, 10) }).exec();
    await this.passwordResetModel.deleteOne({ email }).exec();

    return { message: 'Password reset successfully' };
  }

  async user(data: any): Promise<any> {
    const user = await this.usersModel.findOne({ email: data.email }).exec();
    if (!user) throw new NotFoundException('User not found');

    return {
      message: 'User details',
      user_info: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
      },
    };
  }
}
