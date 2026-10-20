import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { escribirCookieSesion } from '../sesiones/cookie';
import { SesionesService } from '../sesiones/sesiones.service';
import type { RequestConSesion } from '../sesiones/sesion.interface';
import { CrearUsuarioDTO } from './crear-usuario.dto';
import { UsuariosService } from './usuarios.service';

@Controller('usuarios')
export class UsuariosController {
  constructor(
    private readonly usuarios: UsuariosService,
    private readonly sesiones: SesionesService,
  ) {}

  @Post()
  @HttpCode(201)
  async registrar(
    @Body() dto: CrearUsuarioDTO,
    @Req() req: RequestConSesion,
    @Res({ passthrough: true }) res: Response,
  ) {
    // El rol nunca viene del cliente. El admin solo sale del seed.
    const usuario = await this.usuarios.crear({
      username: dto.username,
      password: dto.password,
      rol: 'usuario',
    });

    // Auto-login: reutiliza el mismo flujo que /sesiones, con la misma
    // cookie y el mismo rate-limit por ip|usuario.
    const { token, sesion } = await this.sesiones.iniciar(
      usuario.username,
      dto.password,
      req.ip ?? 'origen-desconocido',
    );
    escribirCookieSesion(res, token, this.sesiones.ttlMs());

    return {
      id: sesion.usuario.id,
      username: sesion.usuario.username,
      rol: sesion.usuario.rol,
      expiraEn: sesion.expiraEn.toISOString(),
    };
  }
}
