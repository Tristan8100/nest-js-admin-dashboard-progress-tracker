import { Module } from '@nestjs/common';
import { UserMapsController } from './user-maps.controller';
import { UserMapsService } from './user-maps.service';

@Module({
  controllers: [UserMapsController],
  providers: [UserMapsService]
})
export class UserMapsModule {}
