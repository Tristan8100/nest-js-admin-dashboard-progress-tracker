import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  User,
  UserSchema,
} from '../users/entities/user.entity';

import {
  UserMap,
  UserMapSchema } from './entities/user-map.entity/user-map.entity';

import { UserMapsController } from './user-maps.controller';
import { UserMapsService } from './user-maps.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
      {
        name: UserMap.name,
        schema: UserMapSchema,
      },
    ]),
  ],
  controllers: [UserMapsController],
  providers: [UserMapsService],
})
export class UserMapsModule {}