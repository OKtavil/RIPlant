import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import type { InsigniaUsuario, Rol } from './usuario.interface';

export type UsuarioDocument = HydratedDocument<UsuarioDocumentModel>;

@Schema({ collection: 'usuarios', versionKey: false })
export class UsuarioDocumentModel {
  @Prop({ required: true, unique: true, index: true, trim: true, maxlength: 50 })
  username: string;

  /** Hash bcrypt completo ($2b$...). Nunca la contraseña en claro. */
  @Prop({ required: true })
  passwordHash: string;

  @Prop({
    required: true,
    type: String,
    enum: ['usuario', 'admin', 'zombie'],
    default: 'usuario',
  })
  rol: Rol;

  @Prop({ required: true, type: Date, default: Date.now })
  creadoEn: Date;

  /**
   * Logros del usuario. Hoy solo `superviviente-zombie`: se otorga al dueño
   * cuando una de sus lápidas revive (edición vía `PUT /lapidas/:id`).
   *
   * Es una lista de sub-documentos y no de strings a propósito: cada insignia
   * necesita saber **qué lápida** la disparó y **cuándo**, y con un string
   * suelto esa información se perdería. El `default: []` evita el `undefined`
   * en los usuarios anteriores a la feature.
   */
  @Prop({
    type: [{ _id: false, codigo: String, lapidaId: Number, obtenidaEn: String }],
    default: [],
  })
  insignias: InsigniaUsuario[];
}

export const UsuarioSchema =
  SchemaFactory.createForClass(UsuarioDocumentModel);
