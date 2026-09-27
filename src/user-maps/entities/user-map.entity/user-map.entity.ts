import { ApiProperty } from '@nestjs/swagger';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserMapDocument = HydratedDocument<UserMap>;

@Schema({ _id: false }) //children children
export class ProgressAttempt {
  @ApiProperty({
    description: 'The date and time when the attempt occurred',
    example: '2026-09-27T01:00:00.000Z',
  })
  @Prop({
    type: Date,
    required: true,
  })
  attempt_time: Date;

  @ApiProperty({
    description: 'The score achieved during this attempt',
    example: 3,
  })
  @Prop({
    type: Number,
    required: true,
  })
  score: number;
}

export const ProgressAttemptSchema =
  SchemaFactory.createForClass(ProgressAttempt);


@Schema({ _id: false })
export class MapProgress { // children
  @Prop({
    type: String,
    enum: ['level', 'tutorial', 'knowledge_check'],
    required: true,
  })
  type: string;

  @ApiProperty({
    description: 'The level of the completed item',
    example: 1,
  })
  @Prop({
    type: Number,
    required: false,
  })
  level?: number;

  @Prop({
    type: Number,
    required: false,
  })
  score?: number;

  @ApiProperty({
    description: 'The date the level was acquired',
    example: '2026-08-15T12:30:00.000Z',
  })
  @Prop({
    type: Date,
    required: false,
    default: Date.now,
  })
  date_acquired: Date;

  @ApiProperty({
    description: 'History of attempts for this progress item',
    type: [ProgressAttempt],
    default: [],
  })
  @Prop({
    type: [ProgressAttemptSchema],
    default: [],
  })
  attempts: ProgressAttempt[];
}

export const MapProgressSchema =
  SchemaFactory.createForClass(MapProgress);



  
@Schema({
  collection: 'user_maps',
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class UserMap { //parent
  @ApiProperty({
    description: 'The ID of the user who owns this map progress',
  })
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  user_id: Types.ObjectId;

  @ApiProperty({
    description: 'The name of the map',
    example: 'Forest of Beginnings',
  })
  @Prop({
    type: String,
    required: true,
  })
  name: string;

  @ApiProperty({
    description: 'The rank of the map',
    example: 1,
  })
  @Prop({
    type: Number,
    required: true,
  })
  rank: number;

  @ApiProperty({
    description: 'The levels completed in this map',
    type: [MapProgress],
    default: [],
  })
  @Prop({
    type: [MapProgressSchema],
    default: [],
  })
  progress: MapProgress[];
}

export const UserMapSchema =
  SchemaFactory.createForClass(UserMap);

UserMapSchema.index(
  {
    user_id: 1,
    rank: 1,
  },
  {
    unique: true,
  },
);