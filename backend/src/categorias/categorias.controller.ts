import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateCategoriaDTO } from './create-categoria.dto';
import { CategoriasService } from './categorias.service';

@Controller('categorias')
export class CategoriasController {
  constructor(private readonly categoriasService: CategoriasService) {}

  @Get()
  findAll() {
    return this.categoriasService.findAll();
  }

  @Post()
  create(@Body() categoria: CreateCategoriaDTO) {
    return this.categoriasService.create(categoria);
  }
}
