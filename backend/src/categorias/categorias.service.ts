import { Injectable } from '@nestjs/common';
import { Categoria } from './categoria.interface';
import { CreateCategoriaDTO } from './create-categoria.dto';

@Injectable()
export class CategoriasService {
  private contadorId: number = 2;
  private readonly categorias: Categoria[] = [
    {
      id: 1,
      nombre: 'Categoria 1',
    },
    {
      id: 2,
      nombre: 'Categoria 2',
    },
  ];

  findAll(): ReadonlyArray<Categoria> {
    var categorias: Categoria[] = this.categorias;
    return categorias;
  }

  create(dto: CreateCategoriaDTO): Categoria {
    let categoria: Categoria = {
      id: ++this.contadorId,
      nombre: dto.nombre,
    };
    this.categorias.push(categoria);
    return categoria;
  }
}
