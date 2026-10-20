import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CreateLapidaDto } from './create-lapida.dto';
import { LapidasService } from './lapidas.service';
import type { RequestConSesion } from '../sesiones/sesion.interface';
import { TAMANIO_MAXIMO_FOTO } from '../almacenamiento/almacenamiento-disco.service';

@Controller('lapidas')
export class LapidasController {
  constructor(private readonly lapidasService: LapidasService) {}

  @Get()
  findAll() {
    return this.lapidasService.findAll();
  }

  @Get('asesinos')
  asesinos() {
    return this.lapidasService.findAsesinos();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.lapidasService.findOne(id);
  }

  @Post()
  create(@Body() lapida: CreateLapidaDto, @Req() req: RequestConSesion) {
    // SesionRequeridaMiddleware ya corrió: sin sesión la petición no llega acá.
    return this.lapidasService.create(lapida, req.sesion!);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() lapida: CreateLapidaDto,
  ) {
    return this.lapidasService.update(id, lapida);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.lapidasService.remove(id);
  }

  @Post(':id/corona')
  async giveCorona(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestConSesion,
    @Res({ passthrough: true }) res: Response,
  ) {
    // SesionRequeridaMiddleware ya corrió: sin sesión la petición no llega acá.
    // Idempotente: `201` cuando la corona se creó, `200` cuando ya existía. El
    // front alterna con un click, así que un reintento no puede ser un error.
    const { lapida, creada } = await this.lapidasService.giveCorona(
      id,
      req.sesion!,
    );
    res.status(creada ? 201 : 200);
    return lapida;
  }

  /**
   * Quita la corona de **este** usuario. Idempotente: `200` siempre, tenga o no
   * corona. El filtro por `usuarioId` en el servicio hace que nadie pueda
   * quitarle la corona a otro, así que no hace falta un middleware de dueño
   * (que además sería incorrecto: la corona es de quien la puso, no del dueño
   * de la lápida).
   */
  @Delete(':id/corona')
  removeCorona(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestConSesion,
  ) {
    return this.lapidasService.removeCorona(id, req.sesion!);
  }

  /**
   * S8: subida de foto. `DuenoOAdminLapidaMiddleware` ya resolvió la
   * autorización y adjuntó la lápida; acá solo queda el archivo.
   *
   * Se usa `memoryStorage` (el default de `FileInterceptor` sin `storage`) y no
   * `diskStorage`: el nombre del archivo lo decide el servicio a partir de los
   * magic bytes, no multer a partir del nombre que manda el cliente. El tope de
   * 5 MB lo aplica multer acá, antes de que el buffer llegue al servicio.
   */
  @Post(':id/foto')
  @UseInterceptors(
    FileInterceptor('foto', { limits: { fileSize: TAMANIO_MAXIMO_FOTO, files: 1 } }),
  )
  subirFoto(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() foto: { buffer?: Buffer } | undefined,
  ) {
    if (!foto?.buffer?.length) {
      throw new BadRequestException('Se requiere una foto en el campo "foto"');
    }
    return this.lapidasService.asignarFoto(id, foto.buffer);
  }
}
