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
import { EmitirCodigoRecuperacionDTO } from './emitir-codigo-recuperacion.dto';
import { RecuperarPasswordDTO } from './recuperar-password.dto';
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

  /**
   * Recuperación pública: no lleva `SesionRequeridaMiddleware` porque quien la
   * usa, justamente, no puede iniciar sesión. La autorización es el código.
   */
  @Post('recuperar')
  @HttpCode(200)
  async recuperar(@Body() dto: RecuperarPasswordDTO) {
    const usuarioId = await this.usuarios.recuperar(dto);
    // Cambiar la contraseña invalida todo lo abierto: un token robado no debe
    // sobrevivir al cambio. Se orquesta acá, como `registrar` orquesta alta +
    // login, para no invertir la dependencia UsuariosService ⇄ SesionesService.
    await this.sesiones.cerrarTodasDeUsuario(usuarioId);
    return { mensaje: 'Tu contraseña se actualizó. Iniciá sesión con la nueva.' };
  }

  @Post(':id/codigo-recuperacion')
  @HttpCode(200)
  async emitirCodigoRecuperacion(
    @Param('id') id: string,
    @Body() dto: EmitirCodigoRecuperacionDTO,
    @Req() req: RequestConSesion,
  ) {
    return this.usuarios.emitirCodigoRecuperacion(
      id,
      dto.passwordActual,
      req.sesion!,
    );
  }

  @Post()
  @HttpCode(201)
  async registrar(
    @Body() dto: CrearUsuarioDTO,
    @Req() req: RequestConSesion,
    @Res({ passthrough: true }) res: Response,
  ) {
    // El rol nunca viene del cliente. El admin solo sale del seed.
    const { usuario, codigoRecuperacion } = await this.usuarios.crear({
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
      // Única vez que este código existe fuera del hash guardado.
      codigoRecuperacion,
    };
  }
}
