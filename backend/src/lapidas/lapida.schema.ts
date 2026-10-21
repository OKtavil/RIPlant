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

  @Prop({ type: String, required: true, index: true })
  usuarioId: string;

  @Prop({ required: true, index: true })
  categoriaId: number;

  @Prop({ default: '', maxlength: 80 })
  causaMuerte: string;

  @Prop({ default: '' })
  fotoUrl: string;

  @Prop({ default: 0, min: 0 })
  coronasCount: number;

  /**
   * S1 de la insignia: la lápida volvió a dar señales de vida. Se enciende
   * cuando su dueño o un admin la editan (`PUT /lapidas/:id`); nunca vuelve a
   * `false`, porque revivir es un hecho, no un estado que se pueda deshacer.
   */
  @Prop({ default: false })
  resucitada: boolean;

  /**
   * Cuándo se rescató por primera vez. Se fija una sola vez: editar diez veces
   * no mueve la fecha, porque la fecha del último retoque no dice nada sobre
   * el hecho de haber revivido.
   */
  @Prop({ default: '' })
  resucitadaEn: string;
}

export const LapidaSchema = SchemaFactory.createForClass(LapidaDocumentModel);
