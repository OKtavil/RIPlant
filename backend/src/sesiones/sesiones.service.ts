import { createHash, randomBytes } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types, type Model } from 'mongoose';
import { UsuariosService } from '../usuarios/usuarios.service';
import type { SesionActiva } from './sesion.interface';
import { SesionDocumentModel, type SesionDocument } from './sesion.schema';

/** Duración por defecto de la sesión: 8 horas. */
const TTL_DEFECTO_HORAS = 8;

/** Genera el token opaco que viaja en la cookie. 32 bytes aleatorios. */
function generarToken(): string {
  return randomBytes(32).toString('base64url');
}

/** SHA-256 en hex: lo único del token que se guarda en la base. */
function hashearToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class SesionesService {
  constructor(
    @InjectModel(SesionDocumentModel.name)
    private readonly sesionModel: Model<SesionDocument>,
    private readonly usuarios: UsuariosService,
  ) {}

  /** TTL en milisegundos, configurable con `SESION_TTL_HORAS`. */
  ttlMs(): number {
    const horas = Number(process.env.SESION_TTL_HORAS);
    const usadas =
      Number.isFinite(horas) && horas > 0 ? horas : TTL_DEFECTO_HORAS;
    return usadas * 60 * 60 * 1000;
  }

  async iniciar(
    username: string,
    password: string,
  ): Promise<{ token: string; sesion: SesionActiva }> {
    const usuario = await this.usuarios.validarCredenciales(username, password);
    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const token = generarToken();
    const expiraEn = new Date(Date.now() + this.ttlMs());
    await this.sesionModel.create({
      tokenHash: hashearToken(token),
      usuarioId: new Types.ObjectId(usuario.id),
      expiraEn,
    });

    return { token, sesion: { usuario, expiraEn } };
  }

  /**
   * Resuelve el token de la cookie a una sesión activa, o `null`. Devuelve
   * `null` (y borra el registro) cuando la sesión venció o el usuario ya no
   * existe: ninguna de las dos se puede confiar con solo mirar el token.
   */
  async resolver(token: string | undefined): Promise<SesionActiva | null> {
    if (!token) return null;

    const tokenHash = hashearToken(token);
    const sesion = await this.sesionModel.findOne({ tokenHash }).lean();
    if (!sesion) return null;

    if (sesion.expiraEn.getTime() <= Date.now()) {
      await this.sesionModel.deleteOne({ tokenHash });
      return null;
    }

    const usuario = await this.usuarios.encontrarPorId(
      String(sesion.usuarioId),
    );
    if (!usuario) {
      await this.sesionModel.deleteOne({ tokenHash });
      return null;
    }

    return { usuario, expiraEn: sesion.expiraEn };
  }

  /** Cierra la sesión: sin registro en la base, la cookie no vale nada. */
  async cerrar(token: string): Promise<void> {
    await this.sesionModel.deleteOne({ tokenHash: hashearToken(token) });
  }
}
