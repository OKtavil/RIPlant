import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CoronaDocument = HydratedDocument<CoronaDocumentModel>;

/**
 * Un registro de "corona" que un usuario dio a una lápida.
 *
 * Existe para que `POST /lapidas/:id/corona` no se pueda inflar. El índice
 * compuesto único `lapidaId + usuarioId` hace que la segunda corona del mismo
 * usuario falle en la base de datos, no en una consulta previa: una consulta
 * previa tiene una carrera entre leer y escribir, el índice no.
 *
 * `lapidaId` es el `id` numérico propio de las lápidas, no su `_id`.
 */
@Schema({ collection: 'coronas', versionKey: false })
export class CoronaDocumentModel {
  @Prop({ required: true, index: true })
  lapidaId: number;

  @Prop({ required: true, index: true })
  usuarioId: string;

  @Prop({ required: true, type: Date, default: Date.now })
  creadaEn: Date;
}

export const CoronaSchema = SchemaFactory.createForClass(CoronaDocumentModel);

CoronaSchema.index({ lapidaId: 1, usuarioId: 1 }, { unique: true });
