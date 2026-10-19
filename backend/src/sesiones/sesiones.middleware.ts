import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import { COOKIE_SESION, leerCookie } from './cookie';
import type { RequestConSesion } from './sesion.interface';
import { SesionesService } from './sesiones.service';

/**
 * Resuelve la cookie de sesión en cada request y la adjunta como `req.sesion`.
 * Es **autenticación** (¿quién sos?), no autorización (¿podés?): esa vive en
 * `AdminMiddleware`. Se aplica a todas las rutas.
 *
 * No lanza excepciones: si no hay cookie, `req.sesion` queda `undefined` y el
 * endpoint decide si eso le importa.
 */
@Injectable()
export class SesionesMiddleware implements NestMiddleware {
  constructor(private readonly sesiones: SesionesService) {}

  async use(
    req: RequestConSesion,
    _res: Response,
    next: NextFunction,
  ): Promise<void> {
    const token = leerCookie(req.headers.cookie, COOKIE_SESION);
    req.sesion = (await this.sesiones.resolver(token)) ?? undefined;
    next();
  }
}
