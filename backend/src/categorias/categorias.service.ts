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

  /**
   * S11: seis categorías = seis **tipos de planta**. La categoría clasifica qué
   * era la planta, no de qué murió; la causa de muerte es su propio campo
   * (`causaMuerte`).
   *
   * Se usa `$set` y no `$setOnInsert` a propósito: los ids 1 y 2 ya están en las
   * bases de desarrollo sembrados con causas de muerte (`Descuido`, `Exceso de
   * cariño`) — el vocabulario equivocado. Con `$setOnInsert` el seed nunca los
   * corregiría y la base seguiría mintiendo. `$set` hace converger el nombre y
   * `$setOnInsert` conserva el alta. Se sigue guardando contra el 11000 por los
   * arranques simultáneos.
   */
  async onModuleInit(): Promise<void> {
    const sembrar = [
      { id: 1, nombre: 'Suculentas' },
      { id: 2, nombre: 'Cactus' },
      { id: 3, nombre: 'Helechos' },
      { id: 4, nombre: 'Aromáticas' },
      { id: 5, nombre: 'Trepadoras' },
      { id: 6, nombre: 'Árboles' },
    ];

    try {
      await this.categoriaModel.bulkWrite(
        sembrar.map((categoria) => ({
          updateOne: {
            filter: { id: categoria.id },
            update: {
              $set: { nombre: categoria.nombre },
              $setOnInsert: { id: categoria.id },
            },
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
