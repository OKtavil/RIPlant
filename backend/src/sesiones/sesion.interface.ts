import type { Request } from 'express';
import type { Usuario } from '../usuarios/usuario.interface';

export interface SesionActiva {
  usuario: Usuario;
  expiraEn: Date;
}

/** Express `Request` con la sesión resuelta por `SesionesMiddleware`. */
export interface RequestConSesion extends Request {
  sesion?: SesionActiva;
}
