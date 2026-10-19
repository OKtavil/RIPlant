import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CategoriaDocument = HydratedDocument<CategoriaDocumentModel>;

@Schema({ collection: 'categorias', versionKey: false })
export class CategoriaDocumentModel {
  @Prop({ required: true, unique: true, index: true })
  id: number;

  @Prop({ required: true, unique: true, trim: true, minlength: 3, maxlength: 20 })
  nombre: string;
}

export const CategoriaSchema = SchemaFactory.createForClass(CategoriaDocumentModel);
