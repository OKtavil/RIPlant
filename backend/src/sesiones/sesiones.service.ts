import { createHash, randomBytes } from 'node:crypto';
import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types, type Model } from 'mongoose';
import { UsuariosService } from '../usuarios/usuarios.service';
import type { SesionActiva } from './sesion.interface';
import { SesionDocumentModel, type SesionDocument } from './sesion.schema';

/** Duración por defecto de la sesión: 8 horas. */
const TTL_DEFECTO_HORAS = 8;

/** Tras estos fallos del mismo origen, el login responde 429. */
const MAX_FALLOS = 5;

/** Ventana del conteo de fallos: 15 minutos. */
const VENTANA_MS = 15 * 60 * 1000;

/** Orígenes recordados antes de purgar las ventanas vencidas. */
const MAX_ORIGENES = 5000;

/** bcrypt cuesta ~50ms de CPU: sin tope, un flood satura el event loop. */
const MAX_BCRYPT_EN_VUELO = 8;

/** 429 del login: Nest 12 no trae excepción propia de "demasiados intentos". */
export class DemasiadosIntentosException extends HttpException {
  constructor(mensaje: string) {
    super(mensaje, HttpStatus.TOO_MANY_REQUESTS);
  }
}

/** Fallos y ventana vigente de un origen. */
type RegistroDeFallos = { fallidos: number; ventanaFin: number };

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
  /** Fallos por origen; la clave es `ip|usuario`. */
  private readonly fallos = new Map<string, RegistroDeFallos>();

  private bcryptEnVuelo = 0;

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

  /** Valida credenciales y abre una sesión. `origen` es la IP del cliente. */
  async iniciar(
    username: string,
    password: string,
    origen = 'origen-desconocido',
  ): Promise<{ token: string; sesion: SesionActiva }> {
    const clave = `${origen}|${username}`;
    if (this.bloquearOrigen(clave)) this.rechazar();
    if (this.bcryptEnVuelo >= MAX_BCRYPT_EN_VUELO) this.rechazar();

    this.bcryptEnVuelo += 1;
    try {
      const usuario = await this.usuarios.validarCredenciales(
        username,
        password,
      );
      if (!usuario) throw new UnauthorizedException('Credenciales inválidas');

      this.fallos.delete(clave);
      const token = generarToken();
      const expiraEn = new Date(Date.now() + this.ttlMs());
      await this.sesionModel.create({
        tokenHash: hashearToken(token),
        usuarioId: new Types.ObjectId(usuario.id),
        expiraEn,
      });

      return { token, sesion: { usuario, expiraEn } };
    } finally {
      this.bcryptEnVuelo -= 1;
    }
  }

  /** Anota el intento del origen y dice si ya superó el tope de fallos. */
  private bloquearOrigen(clave: string): boolean {
    const ahora = Date.now();
    const registro =
      this.fallos.get(clave) ?? { fallidos: 0, ventanaFin: ahora + VENTANA_MS };
    if (registro.ventanaFin <= ahora) {
      registro.fallidos = 0;
      registro.ventanaFin = ahora + VENTANA_MS;
    }
    registro.fallidos += 1;
    this.fallos.set(clave, registro);

    // Un ataque distribuido llenaría el mapa: se sueltan las ventanas vencidas.
    if (this.fallos.size > MAX_ORIGENES) this.purgarVencidas(ahora);

    return registro.fallidos > MAX_FALLOS;
  }

  /** Suelta las ventanas vencidas para que el mapa no crezca sin control. */
  private purgarVencidas(ahora: number): void {
    for (const [clave, registro] of this.fallos) {
      if (registro.ventanaFin <= ahora) this.fallos.delete(clave);
    }
  }

  /** Responde 429: Nest 12 no trae excepción propia para este caso. */
  private rechazar(): never {
    throw new DemasiadosIntentosException(
      'Demasiados intentos de inicio de sesión. Probá de nuevo en unos minutos.',
    );
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
