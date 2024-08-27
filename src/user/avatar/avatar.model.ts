import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { baseSchemaOptions } from '../../mongoose/base-schema-options';

@Schema(baseSchemaOptions)
export class Avatar extends Document {
  @Prop({ required: true, unique: true })
  userId: string;

  @Prop({ required: true })
  hash: string;

  @Prop({ required: true })
  filePath: string;
}

export const AvatarSchema = SchemaFactory.createForClass(Avatar);
