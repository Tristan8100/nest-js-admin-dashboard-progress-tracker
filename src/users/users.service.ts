import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserDocument } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  private async checkEmailExists(
    email: string,
    excludeId?: string,
  ): Promise<void> {
    const query: any = { email };

    if (excludeId) {
      query._id = { $ne: new Types.ObjectId(excludeId) };
    }

    const existingUser = await this.userModel.findOne(query).exec();

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }
  }

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    await this.checkEmailExists(createUserDto.email);

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    return this.userModel.create({
      email: createUserDto.email,
      name: createUserDto.name,
      password: hashedPassword,
      email_verified_at: null,
    });
  }

  async findAll(): Promise<UserDocument[]> {
    return this.userModel.find().exec();
  }

  async findOne(id: string | Types.ObjectId): Promise<UserDocument> {
    const objectId = typeof id === 'string' ? new Types.ObjectId(id) : id;

    const user = await this.userModel.findById(objectId).exec();

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async update(
    id: string | Types.ObjectId,
    updateUserDto: UpdateUserDto,
  ): Promise<UserDocument> {
    const user = await this.findOne(id);

    if (updateUserDto.email) {
      await this.checkEmailExists(updateUserDto.email, user._id.toString());
    }

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    Object.assign(user, updateUserDto);

    return user.save();
  }

  async remove(id: string | Types.ObjectId): Promise<void> {
    const user = await this.findOne(id);
    await user.deleteOne();
  }
}
