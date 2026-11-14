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

  /**
   * SHA-256 del código de recuperación normalizado. Nunca el código en claro.
   *
   * `select: false` a propósito: el hash es tan sensible como `passwordHash`.
   * Las lecturas que lo necesitan (recuperar, emitir) lo piden explícitamente
   * con `.select('+codigoRecuperacionHash')`; el resto no lo ve.
   *
   * Es opcional porque los usuarios previos a esta feature no lo tienen: un
   * código se emite al registrarse o cuando el dueño/admin lo regenera.
   */
  @Prop({ type: String, required: false, select: false })
  codigoRecuperacionHash?: string;

  @Prop({
    required: true,
    type: String,
    enum: ['usuario', 'admin', 'zombie'],
    default: 'usuario',
  })
  rol: Rol;

  @Prop({ required: true, type: Date, default: Date.now })
  creadoEn: Date;

  @Prop({ type: String, trim: true, maxlength: 280, default: '' })
  descripcion: string;

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
