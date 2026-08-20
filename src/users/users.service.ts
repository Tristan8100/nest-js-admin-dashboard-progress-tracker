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
import { RegisterStudentDto } from './dto/register-student.dto';
import { UserQueryDto } from './dto/user-query.dto';

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

  private async checkUsernameExists(
    username: string,
    excludeId?: string,
  ): Promise<void> {
    const query: any = { username };

    if (excludeId) {
      query._id = { $ne: new Types.ObjectId(excludeId) };
    }

    const existingUser = await this.userModel.findOne(query).exec();

    if (existingUser) {
      throw new ConflictException('Username already exists');
    }
  }

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    await this.checkEmailExists(createUserDto.email);
    await this.checkUsernameExists(createUserDto.username);

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    return this.userModel.create({
      email: createUserDto.email,
      name: createUserDto.name,
      username: createUserDto.username,
      // gradeLevel: createUserDto.gradeLevel,
      // section: createUserDto.section,
      role: 'admin', // default role since teacher can only register
      password: hashedPassword,
      email_verified_at: null,
    });
  }

  async registerStudent(dto: RegisterStudentDto) {
    const existingUsername = await this.userModel.exists({
      username: dto.username,
    });

    if (existingUsername) {
      throw new ConflictException('Username already taken');
    }

    if (dto.email) {
      const existingEmail = await this.userModel.exists({
        email: dto.email,
      });

      if (existingEmail) {
        throw new ConflictException('Email already taken');
      }
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const student = new this.userModel({
      name: dto.name,
      username: dto.username,
      password: hashedPassword,
      section: dto.section,
      gradeLevel: dto.gradeLevel,

      ...(dto.email
        ? {
            email: dto.email,
          }
        : {}),
    });

    const saved = await student.save();

    const { password, ...safeStudent } =
      saved.toObject();

    return safeStudent;
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
  ) {
    const user = await this.findOne(id);

    if (updateUserDto.email) {
      await this.checkEmailExists(
        updateUserDto.email,
        user._id.toString(),
      );
    }

    if (updateUserDto.username) {
      await this.checkUsernameExists(
        updateUserDto.username,
        user._id.toString(),
      );
    }

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(
        updateUserDto.password,
        10,
      );
    }

    const updatedUser =
      await this.userModel.findByIdAndUpdate(
        id,
        updateUserDto,
        {
          new: true,
          runValidators: true,
        },
      );

    return updatedUser;
  }

  async remove(id: string | Types.ObjectId): Promise<void> {
    const user = await this.findOne(id);
    await user.deleteOne();
  }

  async findStudents(query: UserQueryDto) {
    const {
      search,
      gradeLevel,
      section,
      page = 1,
      limit = 10,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = query;

    const filter: Record<string, any> = {
      role: 'user',
    };

    if (search?.trim()) {
      const regex = new RegExp(search.trim(), 'i');

      filter.$or = [
        { name: regex },
        { username: regex },
        { email: regex },
      ];
    }

    if (gradeLevel !== undefined) {
      filter.gradeLevel = gradeLevel;
    }

    if (section?.trim()) {
      filter.section = section.trim();
    }

    const skip = (page - 1) * limit;

    const sort: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === 'asc' ? 1 : -1,
    };

    const [students, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select('-password')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),

      this.userModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: students,

      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }
}
