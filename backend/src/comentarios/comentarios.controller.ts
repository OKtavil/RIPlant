import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
} from '@nestjs/common';
import type { RequestConSesion } from '../sesiones/sesion.interface';
import { ComentariosService } from './comentarios.service';
import { CreateComentarioDto } from './create-comentario.dto';

/**
 * Los tres endpoints de S6.
 *
 * Va sin prefijo de módulo porque S6 pide rutas en dos colecciones distintas
 * (`/lapidas/:id/comentarios` y `/comentarios/:id`); un `@Controller('lapidas')`
 * no puede servir las segundas. `GET` y `POST` no chocan con
 * `LapidasController`: `lapidas/:id` exige un solo segmento y `/lapidas/1/
 * comentarios` tiene dos.
 */
@Controller()
export class ComentariosController {
  constructor(private readonly comentariosService: ComentariosService) {}

  @Get('lapidas/:id/comentarios')
  listar(@Param('id', ParseIntPipe) id: number) {
    return this.comentariosService.listar(id);
  }

  @Post('lapidas/:id/comentarios')
  crear(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateComentarioDto,
    @Req() req: RequestConSesion,
  ) {
    // SesionRequeridaMiddleware ya corrió: sin sesión la petición no llega acá.
    return this.comentariosService.crear(id, req.sesion!, dto);
  }

  @Delete('comentarios/:id')
  borrar(@Param('id') id: string) {
    // AdminMiddleware ya corrió: acá solo llega un admin.
    return this.comentariosService.borrar(id);
  }}
