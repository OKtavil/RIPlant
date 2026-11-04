import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Put,
  Req,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { escribirCookieSesion } from '../sesiones/cookie';
import { SesionesService } from '../sesiones/sesiones.service';
import type { RequestConSesion } from '../sesiones/sesion.interface';
import { ActualizarDescripcionDTO } from './actualizar-descripcion.dto';
import { CrearUsuarioDTO } from './crear-usuario.dto';
import { UsuariosService } from './usuarios.service';

@Controller('usuarios')
export class UsuariosController {
  constructor(
    private readonly usuarios: UsuariosService,
    private readonly sesiones: SesionesService,
  ) {}

  @Get()
  async listar() {
    return this.usuarios.listarPublico();
  }

  @Get(':id')
  async obtener(@Param('id') id: string) {
    const usuario = await this.usuarios.porId(id);
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    return usuario;
  }

  @Put(':id/descripcion')
  async actualizarDescripcion(
    @Param('id') id: string,
    @Body() dto: ActualizarDescripcionDTO,
    @Req() req: RequestConSesion,
  ) {
    return this.usuarios.actualizarDescripcion(id, dto.descripcion, req.sesion!);
  }

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
      insignias: sesion.usuario.insignias ?? [],
      descripcion: sesion.usuario.descripcion ?? '',
      expiraEn: sesion.expiraEn.toISOString(),
    };
  }
}
