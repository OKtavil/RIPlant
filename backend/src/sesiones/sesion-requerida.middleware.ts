import {
  Injectable,
  UnauthorizedException,
  type NestMiddleware,
} from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import type { RequestConSesion } from './sesion.interface';

/**
 * **Autenticación**: exige sesión iniciada, sin mirar el rol. Va después de
 * `SesionesMiddleware`, que es quien rellena `req.sesion`.
 *
 * Solo 401: sin sesión no sabemos quién sos. Quien autoriza por rol es
 * `AdminMiddleware` y quien autoriza por dueño es
 * `DuenoOAdminLapidaMiddleware`; no se mezclan las dos responsabilidades.
 */
@Injectable()
export class SesionRequeridaMiddleware implements NestMiddleware {
  use(req: RequestConSesion, _res: Response, next: NextFunction): void {
    if (!req.sesion) {
      throw new UnauthorizedException('Se requiere una sesión iniciada');
    }
    next();
  }
}
