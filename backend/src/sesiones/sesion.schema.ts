import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SesionDocument = HydratedDocument<SesionDocumentModel>;

/**
 * Una sesión viva. El token opaco que viaja en la cookie **no** se guarda:
 * aquí vive solo su SHA-256. Si la colección se filtra, las cookies robadas no
 * sirven para nada.
 *
 * `expiraEn` lleva índice TTL (`expires: 0`), así Mongo borra los documentos
 * vencidos solo. Ojo: el TTL corre cada ~60s, por eso el servicio también
 * valida la fecha al resolver.
 */
@Schema({ collection: 'sesiones', versionKey: false })
export class SesionDocumentModel {
  @Prop({ required: true, unique: true, index: true })
  tokenHash: string;

  @Prop({ required: true, index: true, type: Types.ObjectId, ref: 'UsuarioDocumentModel' })
  usuarioId: Types.ObjectId;

  @Prop({ required: true, type: Date, expires: 0 })
  expiraEn: Date;

  @Prop({ required: true, type: Date, default: Date.now })
  creadaEn: Date;
}

export const SesionSchema =
  SchemaFactory.createForClass(SesionDocumentModel);
