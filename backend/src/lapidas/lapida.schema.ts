import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type LapidaDocument = HydratedDocument<LapidaDocumentModel>;

@Schema({ collection: 'lapidas', versionKey: false })
export class LapidaDocumentModel {
  @Prop({ required: true, unique: true, index: true })
  id: number;

  @Prop({ required: true, trim: true, maxlength: 40 })
  nombrePlanta: string;

  @Prop({ required: true, maxlength: 280 })
  epitafio: string;

  @Prop({ required: true })
  fechaFallecimiento: string;

  @Prop({ required: true })
  fechaPublicacion: string;

  @Prop({ required: true, trim: true, maxlength: 40 })
  autor: string;

  @Prop({ required: true, index: true })
  categoriaId: number;

  @Prop({ required: true, maxlength: 80 })
  causaMuerte: string;

  @Prop({ default: '' })
  fotoUrl: string;

  @Prop({ default: 0, min: 0 })
  coronasCount: number;
}

export const LapidaSchema = SchemaFactory.createForClass(LapidaDocumentModel);
