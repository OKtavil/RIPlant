import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ComentarioDocument = HydratedDocument<ComentarioDocumentModel>;

/**
 * Un comentario sobre una lápida (S6).
 *
 * `autor` es una copia del `username` que resuelve la sesión. No tiene
 * `maxlength`: lo escribe el servidor, nunca el cliente, y su longitud ya
 * está definida al registrarse. `lapidaId` es el `id` numérico propio de las
 * lápidas, igual que en `coronas`, no su `_id`.
 */
@Schema({ collection: 'comentarios', versionKey: false })
export class ComentarioDocumentModel {
  @Prop({ required: true, index: true })
  lapidaId: number;

  @Prop({ required: true, index: true })
  usuarioId: string;

  @Prop({ required: true, trim: true })
  autor: string;

  @Prop({ required: true, maxlength: 500 })
  texto: string;

  @Prop({ required: true, type: Date, default: Date.now })
  creadoEn: Date;
}

export const ComentarioSchema = SchemaFactory.createForClass(
  ComentarioDocumentModel,
);
