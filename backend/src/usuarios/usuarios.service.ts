import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { hashPassword, verifyPassword } from './password';
import type { Rol, Usuario } from './usuario.interface';
import { UsuarioDocumentModel } from './usuario.schema';

@Injectable()
export class UsuariosService implements OnModuleInit {
  private readonly logger = new Logger(UsuariosService.name);

  constructor(
    @InjectModel(UsuarioDocumentModel.name)
    private readonly usuarioModel: Model<UsuarioDocumentModel>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.siembraAdministrador();
  }

  /**
   * Crea el usuario administrador si no existe. En desarrollo usa una
   * contraseña por defecto documentada; en producción exige ADMIN_PASSWORD.
   */
  private async siembraAdministrador(): Promise<void> {
    const username = process.env.ADMIN_USERNAME?.trim() || 'admin';
    const enProduccion = process.env.NODE_ENV === 'production';
    const passwordDelEntorno = process.env.ADMIN_PASSWORD;

    // El aviso depende de si la contraseña vino del entorno o del default, no de
    // si estamos en producción: avisar en desarrollo aunque el usuario ya haya
    // definido su propia contraseña es un mensaje que miente.
    const usandoDefault = !passwordDelEntorno && !enProduccion;
    const password = passwordDelEntorno ?? (enProduccion ? undefined : 'riplanta123');

    if (!password) {
      this.logger.error(
        `ADMIN_PASSWORD no está definida: no se creó el usuario "${username}". ` +
          'Definilo en backend/.env antes de levantar el servidor.',
      );
      return;
    }

    if (usandoDefault) {
      this.logger.warn(
        `Usuario administrador "${username}" usa la contraseña por defecto de ` +
          'desarrollo (riplanta123). Definí ADMIN_PASSWORD antes de publicar.',
      );
    }

    try {
      // En cada arranque el entorno manda: si cambia ADMIN_PASSWORD, cambia la
      // contraseña. No se guarda la contraseña, solo su hash.
      await this.usuarioModel.updateOne(
        { username },
        {
          $set: { passwordHash: await hashPassword(password), rol: 'admin' },
          $setOnInsert: { username, creadoEn: new Date() },
        },
        { upsert: true },
      );
    } catch (error) {
      // 11000 = duplicate key: dos arranques simultáneos sembraron a la vez.
      if ((error as { code?: number }).code !== 11000) throw error;
    }
  }

  async crear(datos: {
    username: string;
    password: string;
    rol: Rol;
  }): Promise<Usuario> {
    const creado = await this.usuarioModel.create({
      username: datos.username,
      passwordHash: await hashPassword(datos.password),
      rol: datos.rol,
    });
    return this.aDominio(creado);
  }

  /**
   * Devuelve el usuario si las credenciales coinciden, o `null`. El hash nunca
   * sale de este método.
   */
  async validarCredenciales(
    username: string,
    password: string,
  ): Promise<Usuario | null> {
    const usuario = await this.usuarioModel.findOne({ username }).lean();
    const coincide = await verifyPassword(password, usuario?.passwordHash ?? null);
    return coincide && usuario ? this.aDominio(usuario) : null;
  }

  async encontrarPorId(id: string): Promise<Usuario | null> {
    const usuario = await this.usuarioModel.findById(id).lean();
    return usuario ? this.aDominio(usuario) : null;
  }

  private aDominio(doc: {
    _id: unknown;
    username: string;
    rol: Rol;
  }): Usuario {
    return { id: String(doc._id), username: doc.username, rol: doc.rol };
  }
}
