import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Logger,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  COOKIE_SESION,
  borrarCookieSesion,
  escribirCookieSesion,
  leerCookie,
} from './cookie';
import { IniciarSesionDTO } from './iniciar-sesion.dto';
import type { RequestConSesion } from './sesion.interface';
import { SesionesService } from './sesiones.service';

@Controller('sesiones')
export class SesionesController {
  private readonly logger = new Logger(SesionesController.name);

  constructor(private readonly sesiones: SesionesService) {}

  @Post()
  async iniciar(
    @Body() dto: IniciarSesionDTO,
    @Req() req: RequestConSesion,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, sesion } = await this.sesiones.iniciar(
      dto.username,
      dto.password,
      req.ip ?? 'origen-desconocido',
    );
    escribirCookieSesion(res, token, this.sesiones.ttlMs());
    return this.aRespuesta(sesion.usuario, sesion.expiraEn);
  }

  @Get('actual')
  actual(@Req() req: RequestConSesion) {
    if (!req.sesion) {
      throw new UnauthorizedException('No hay una sesión iniciada');
    }
    return this.aRespuesta(req.sesion.usuario, req.sesion.expiraEn);
  }

  @Delete()
  @HttpCode(204)
  async cerrar(
    @Req() req: RequestConSesion,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const token = leerCookie(req.headers.cookie, COOKIE_SESION);
    if (token) {
      // R4-LOGOUT-COOKIE-AFTER-DB: el borrado en la base es best-effort, pero la
      // cookie se borra SIEMPRE. Si `cerrar` lanzara (Mongo caído, timeout) y la
      // excepción se propagara, `borrarCookieSesion` no correría: el servidor no
      // borraría nada y la cookie quedaría viva en el browser, con el usuario
      // creyendo que cerró sesión. El cierre del lado del cliente no puede
      // depender de que la base responda. Se loguea para no perder el rastro:
      // la sesión de la base quedará viva hasta que expire por TTL.
      try {
        await this.sesiones.cerrar(token);
      } catch (error) {
        this.logger.warn(
          `No se pudo borrar la sesión de la base; la cookie igual se borra y la sesión expirará por TTL: ${(error as Error).message}`,
        );
      }
    }
    borrarCookieSesion(res);
  }

  private aRespuesta(
    usuario: { id: string; username: string; rol: string },
    expiraEn: Date,
  ) {
    return {
      id: usuario.id,
      username: usuario.username,
      rol: usuario.rol,
      expiraEn: expiraEn.toISOString(),
    };
  }
}
