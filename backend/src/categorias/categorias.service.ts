import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Categoria } from './categoria.interface';
import { CreateCategoriaDTO } from './create-categoria.dto';
import { CategoriaDocument, CategoriaDocumentModel } from './categoria.schema';

@Injectable()
export class CategoriasService {
  constructor(
    @InjectModel(CategoriaDocumentModel.name)
    private readonly categoriaModel: Model<CategoriaDocument>,
  ) {}

  async onModuleInit(): Promise<void> {
    // S11: seis categorías, en el vocabulario del dominio. Los ids 1 y 2 ya
    // existen en bases de desarrollo; $setOnInsert + upsert los deja como
    // están y agrega las que faltan. El seed de lápidas referencia hasta la 6.
    const sembrar = [
      { id: 1, nombre: 'Descuido' },
      { id: 2, nombre: 'Exceso de cariño' },
      { id: 3, nombre: 'Olvido' },
      { id: 4, nombre: 'Clima extremo' },
      { id: 5, nombre: 'Plagas' },
      { id: 6, nombre: 'Accidente' },
    ];

    try {
      await this.categoriaModel.bulkWrite(
        sembrar.map((categoria) => ({
          updateOne: {
            filter: { id: categoria.id },
            update: { $setOnInsert: { ...categoria } },
            upsert: true,
          },
        })),
      );
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
    }
  }

  async findAll(): Promise<ReadonlyArray<Categoria>> {
    const categorias = await this.categoriaModel.find().sort({ _id: 1 }).lean();
    return categorias.map(({ id, nombre }) => ({ id, nombre }));
  }

  async create(dto: CreateCategoriaDTO): Promise<Categoria> {
    const ultimo = await this.categoriaModel.findOne().sort({ id: -1 }).lean();
    const categoria = await this.categoriaModel.create({
      id: (ultimo?.id ?? 0) + 1,
      nombre: dto.nombre,
    });
    return { id: categoria.id, nombre: categoria.nombre };
  }

  async update(id: number, dto: CreateCategoriaDTO): Promise<Categoria> {
    const categoria = await this.categoriaModel.findOneAndUpdate(
      { id },
      { nombre: dto.nombre },
      { new: true, runValidators: true },
    );
    if (!categoria) throw new NotFoundException('Categoría no encontrada');
    return { id: categoria.id, nombre: categoria.nombre };
  }

  async remove(id: number): Promise<Categoria> {
    const categoria = await this.categoriaModel.findOneAndDelete({ id });
    if (!categoria) throw new NotFoundException('Categoría no encontrada');
    return { id: categoria.id, nombre: categoria.nombre };
  }
}
