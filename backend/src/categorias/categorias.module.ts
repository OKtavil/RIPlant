import { Module } from '@nestjs/common';
import { CategoriasController } from './categorias.controller';
import { CategoriasService } from './categorias.service';
import { MongooseModule } from '@nestjs/mongoose';
import { CategoriaDocumentModel, CategoriaSchema } from './categoria.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CategoriaDocumentModel.name, schema: CategoriaSchema },
    ]),
  ],
  controllers: [CategoriasController],
  providers: [CategoriasService]
})
export class CategoriasModule {}
