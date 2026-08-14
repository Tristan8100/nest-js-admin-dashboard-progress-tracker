import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type EmailVerificationDocument = HydratedDocument<EmailVerification>;

@Schema({
  collection: 'email_verifications',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, // AUTO timestamps
})
export class EmailVerification {
  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  code: string;

  @Prop({ default: false })
  verified: boolean;

  // Declare for TypeScript only (optional)
  created_at: Date;
  updated_at: Date;
}

export const EmailVerificationSchema = SchemaFactory.createForClass(EmailVerification);
