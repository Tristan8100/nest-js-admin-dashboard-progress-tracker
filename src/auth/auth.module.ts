import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from 'src/users/users.module';
import { User, UserSchema } from 'src/users/entities/user.entity';
import { JwtModule } from '@nestjs/jwt'; // also import this on @module below since it's a module
import { jwtConstants } from './constants';
import { EmailVerification, EmailVerificationSchema } from './entities/email-verification.entity';
import { PasswordReset, PasswordResetSchema } from './entities/password-reset.entity';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [MongooseModule.forFeature([
    { name: User.name, schema: UserSchema },
    { name: EmailVerification.name, schema: EmailVerificationSchema },
    { name: PasswordReset.name, schema: PasswordResetSchema },
  ]),
  UsersModule,
  JwtModule.register({
      global: true,
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '1d' },
    }),], // import if gonna use in this module
  controllers: [AuthController],
  providers: [AuthService]
})
export class AuthModule {}
