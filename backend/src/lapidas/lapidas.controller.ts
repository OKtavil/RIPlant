import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { CreateLapidaDto } from './create-lapida.dto';
import { LapidasService } from './lapidas.service';
import type { RequestConSesion } from '../sesiones/sesion.interface';

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
    if (!req.sesion) throw new Error('Sesión requerida');
    return this.lapidasService.create(lapida, req.sesion);
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
  giveCorona(@Param('id', ParseIntPipe) id: number) {
    return this.lapidasService.giveCorona(id);
  }
}
