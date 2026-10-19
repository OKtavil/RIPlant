import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { CreateLapidaDto } from './create-lapida.dto';
import { LapidasService } from './lapidas.service';

@Controller('lapidas')
export class LapidasController {
  constructor(private readonly lapidasService: LapidasService) {}

  @Get()
  findAll() {
    return this.lapidasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.lapidasService.findOne(id);
  }

  @Post()
  create(@Body() lapida: CreateLapidaDto) {
    return this.lapidasService.create(lapida);
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
