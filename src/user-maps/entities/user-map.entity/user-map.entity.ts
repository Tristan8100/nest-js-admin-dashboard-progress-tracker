import { ApiProperty } from '@nestjs/swagger';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserMapDocument = HydratedDocument<UserMap>;

@Schema({ _id: false })
export class MapProgress { //children
  @Prop({ type: String, enum: ['level', 'tutorial', 'knowledge_check'], required: true })
  type: string;

  @ApiProperty({
    description: 'The index of the completed item',
    example: 1,
  })
  @Prop({ type: Number, required: true })
  index: number; // level index, tutorial index, or KC index — depends on `type`

  @Prop({ type: Number, required: false })
  score?: number; // stars (levels), correct-count (knowledge checks). Omit/null for tutorials.

  @ApiProperty({
    description: 'The date the level was acquired',
    example: '2026-08-15T12:30:00.000Z',
  })
  @Prop({
    type: Date,
    required: true,
  })
  date_acquired: Date;
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