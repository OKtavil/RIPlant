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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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
  giveCorona(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestConSesion,
  ) {
    // SesionRequeridaMiddleware ya corrió: sin sesión la petición no llega acá.
    return this.lapidasService.giveCorona(id, req.sesion!);
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
