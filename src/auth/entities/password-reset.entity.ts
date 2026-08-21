import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PasswordResetDocument = HydratedDocument<PasswordReset>;

@Schema({
  collection: 'password_resets',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, // AUTO timestamps
})
export class PasswordReset {
  @Prop({ required: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  code: string;

  @Prop({ required: false, default: null })
  token: string;

  // Declare for TypeScript only
  created_at: Date;
  updated_at: Date;
}

export const PasswordResetSchema = SchemaFactory.createForClass(PasswordReset);
