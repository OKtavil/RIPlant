import { Injectable, Logger, type NestMiddleware } from '@nestjs/common';
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
 *
 * R4-AUTH-OBSERVABILITY-GAP: que `resolver` falle (base caída, timeout) tampoco
 * es motivo para tumbar el request. El middleware es **global**, así que una
 * excepción sin capturar convierte una caída de Mongo en un **500 de toda la
 * app** — incluso en las rutas públicas (`GET /lapidas`, `GET /categorias`),
 * que no necesitan base para responder. Se degrada a "sin sesión" y se loguea:
 * sin ese log, los `401` masivos parecen usuarios deslogueándose cuando la causa
 * real está en la base.
 */
@Injectable()
export class SesionesMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SesionesMiddleware.name);

  constructor(private readonly sesiones: SesionesService) {}

  async use(
    req: RequestConSesion,
    _res: Response,
    next: NextFunction,
  ): Promise<void> {
    const token = leerCookie(req.headers.cookie, COOKIE_SESION);
    try {
      req.sesion = (await this.sesiones.resolver(token)) ?? undefined;
    } catch (error) {
      // La sesión queda como "sin sesión": las rutas que la exigen responderán
      // 401 y las públicas siguen funcionando. La cookie NO se borra acá — si
      // el fallo es transitorio, la sesión del usuario sigue siendo válida.
      req.sesion = undefined;
      this.logger.warn(
        `No se pudo resolver la sesión (se trata como anónimo): ${(error as Error).message}`,
      );
    }
    next();
  }
}
