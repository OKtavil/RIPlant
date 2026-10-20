import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  type NestMiddleware,
} from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import { LapidasService } from '../lapidas/lapidas.service';
import type { RequestConSesion } from './sesion.interface';

export interface RequestConLapida extends RequestConSesion {
  lapida?: any;
}

@Injectable()
export class DuenoOAdminLapidaMiddleware implements NestMiddleware {
  constructor(private readonly lapidas: LapidasService) {}

  async use(req: RequestConLapida, _res: Response, next: NextFunction): Promise<void> {
    if (!req.sesion) {
      throw new UnauthorizedException('Se requiere una sesión iniciada');
    }

    const idParam = req.params['id'];
    const id = Number(idParam);
    if (!Number.isInteger(id) || id < 1) {
      throw new NotFoundException('Lápida no encontrada');
    }

    const lapida = await this.lapidas.findById(id);
    if (!lapida) {
      throw new NotFoundException('Lápida no encontrada');
    }

    const sesion = req.sesion;
    if (sesion.usuario.rol === 'admin') {
      req.lapida = lapida;
      return next();
    }

    if (String((lapida as any).usuarioId) === sesion.usuario.id) {
      req.lapida = lapida;
      return next();
    }

    throw new ForbiddenException('No tenés permiso para esta lápida');
  }
}
