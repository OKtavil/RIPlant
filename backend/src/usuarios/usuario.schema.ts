import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import type { Rol } from './usuario.interface';

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
}

export const UsuarioSchema =
  SchemaFactory.createForClass(UsuarioDocumentModel);
