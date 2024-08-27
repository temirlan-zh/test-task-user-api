import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { baseSchemaOptions } from '../mongoose/base-schema-options';

@Schema({ ...baseSchemaOptions, strict: false })
export class User extends Document {
  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  avatar: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
