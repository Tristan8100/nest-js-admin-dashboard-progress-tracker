import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import {
  Model,
  Types,
} from 'mongoose';

import {
  User,
  UserDocument,
} from '../users/entities/user.entity';

import {
  UserMap,
  UserMapDocument } from './entities/user-map.entity/user-map.entity';

import { CreateProgressDto } from './dto/create-progress.dto/create-progress.dto';

@Injectable()
export class UserMapsService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    @InjectModel(UserMap.name)
    private readonly userMapModel: Model<UserMapDocument>,
  ) {}

  async saveProgress(
    userId: string,
    rank: number,
    createProgressDto: CreateProgressDto,
  ) {
    this.validateObjectId(userId);
  
    const userExists = await this.userModel.exists({
      _id: userId,
    });
  
    if (!userExists) {
      throw new NotFoundException('User not found');
    }
  
    let userMap = await this.userMapModel.findOne({
      user_id: userId,
      rank,
    });
  
    // User has never played this map.
    // Create the map progress automatically.
    if (!userMap) {
      userMap = new this.userMapModel({ //create parent first
        user_id: new Types.ObjectId(userId),
        name: createProgressDto.name,
        rank,
        progress: [
          {
            type: createProgressDto.type,
            index: createProgressDto.index,
            score: createProgressDto.score,
            date_acquired: new Date(),
          },
        ],
      });
  
      return userMap.save();
    }
  
    // Map already exists.
    const existingProgress =
      userMap.progress.find(
        (progress) =>
          progress.index === createProgressDto.index &&
          progress.type === createProgressDto.type,
      );
  
    if (!existingProgress) {
      userMap.progress.push({
        type: createProgressDto.type,
        index: createProgressDto.index,
        score: createProgressDto.score,
        date_acquired: new Date(),
      });
    } else {
      existingProgress.score = createProgressDto.score;
      existingProgress.date_acquired = new Date();
    }
  
    // Keep the latest name from the game.
    userMap.name = createProgressDto.name;
  
    return userMap.save();
  }

  async updateProgress(
    userId: string,
    rank: number,
    level: number,
    score: number,
  ) {
    this.validateObjectId(userId);

    const userMap = await this.userMapModel.findOne({
      user_id: userId,
      rank,
    });

    if (!userMap) {
      throw new NotFoundException(
        'User has no progress for this map',
      );
    }

    const progress = userMap.progress.find(
      (item) => item.index === level,
    );

    if (!progress) {
      throw new NotFoundException(
        'Progress for this level not found',
      );
    }

    progress.score = score;
    progress.date_acquired = new Date();

    return userMap.save();
  }

  async findAllUserMaps(
    userId: string,
  ) {
    this.validateObjectId(userId);

    return this.userMapModel
      .find({
        user_id: userId,
      })
      .sort({
        rank: 1,
      })
      .lean();
  }

  async findUserMap(
    userId: string,
    rank: number,
  ) {
    this.validateObjectId(userId);

    const userMap =
      await this.userMapModel
        .findOne({
          user_id: userId,
          rank,
        })
        .lean();

    if (!userMap) {
      throw new NotFoundException(
        'User has no progress for this map',
      );
    }

    return userMap;
  }

  async findProgress(
    userId: string,
    rank: number,
  ) {
    const userMap =
      await this.findUserMap(
        userId,
        rank,
      );

    return userMap.progress;
  }

  async deleteProgress(
    userId: string,
    rank: number,
    level: number,
  ) {
    this.validateObjectId(userId);

    const userMap =
      await this.userMapModel.findOne({
        user_id: userId,
        rank,
      });

    if (!userMap) {
      throw new NotFoundException(
        'User has no progress for this map',
      );
    }

    const progressIndex =
      userMap.progress.findIndex(
        (progress) =>
          progress.index === level,
      );

    if (progressIndex === -1) {
      throw new NotFoundException(
        'Progress for this level not found',
      );
    }

    userMap.progress.splice(
      progressIndex,
      1,
    );

    // If no levels remain, remove the
    // user's map record as well.
    if (userMap.progress.length === 0) {
      await userMap.deleteOne();

      return {
        message:
          'Progress and empty map record deleted successfully',
      };
    }

    await userMap.save();

    return {
      message:
        'Progress deleted successfully',
    };
  }

  private validateObjectId(
    id: string,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(
        `Invalid user ID: ${id}`,
      );
    }
  }
}