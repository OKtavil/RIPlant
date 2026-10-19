import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  type NestMiddleware,
} from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import type { RequestConSesion } from './sesion.interface';

/**
 * **Autorización**: solo el rol `admin` pasa. Va después de
 * `SesionesMiddleware`, que es quien rellena `req.sesion`.
 *
 * 401 y 403 son cosas distintas y no son intercambiables:
 * - `401` = no sabemos quién sos (sin sesión).
 * - `403` = sabemos quién sos y no podés (rol `usuario`).
 * Mezclarlos le dice al cliente que repita con otras credenciales cuando el
 * problema real es que sus credenciales no alcanzan.
 */
@Injectable()
export class AdminMiddleware implements NestMiddleware {
  use(req: RequestConSesion, _res: Response, next: NextFunction): void {
    if (!req.sesion) {
      throw new UnauthorizedException('Se requiere una sesión iniciada');
    }
    if (req.sesion.usuario.rol !== 'admin') {
      throw new ForbiddenException('Se requiere el rol administrador');
    }
    next();
  }
}
