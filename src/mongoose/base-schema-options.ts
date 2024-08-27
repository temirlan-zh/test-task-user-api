import { SchemaOptions } from 'mongoose';

export const baseSchemaOptions: SchemaOptions = {
  toJSON: {
    versionKey: false,
  },
  toObject: {
    versionKey: false,
  },
};
