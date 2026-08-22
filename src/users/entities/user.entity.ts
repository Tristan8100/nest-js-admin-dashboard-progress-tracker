import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({
  collection: 'users',
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class User {
  @Prop({
    required: false,
    unique: true,
    sparse: true,
  })
  email?: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  username: string;

  @Prop({
    type: String,
    enum: ['admin', 'user'],
    default: 'user',
  })
  role: string;

  @Prop({
    required: true,
    default: 0,
  })
  coins: number;

  @Prop({
    required: true,
    default: null,
  })
  gradeLevel: number;

  @Prop({
    required: true,
    default: null,
  })
  section: string;

  @Prop({ required: true })
  password: string;

  @Prop({
    type: String,
    enum: ['BOY', 'GIRL'],
    required: true,
    default: null,
  })
  gender: 'BOY' | 'GIRL' | null;

  @Prop({
    type: Date,
    default: null,
  })
  email_verified_at: Date | null;
}

export const UserSchema = SchemaFactory.createForClass(User);