import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
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
  constructor(private readonly sesiones: SesionesService) {}

  @Post()
  async iniciar(
    @Body() dto: IniciarSesionDTO,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, sesion } = await this.sesiones.iniciar(
      dto.username,
      dto.password,
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
      await this.sesiones.cerrar(token);
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
