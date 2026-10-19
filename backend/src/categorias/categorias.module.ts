import {
  type MiddlewareConsumer,
  Module,
  type NestModule,
  RequestMethod,
} from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminMiddleware } from '../sesiones/admin.middleware';
import { CategoriaDocumentModel, CategoriaSchema } from './categoria.schema';
import { CategoriasController } from './categorias.controller';
import { CategoriasService } from './categorias.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CategoriaDocumentModel.name, schema: CategoriaSchema },
    ]),
  ],
  controllers: [CategoriasController],
  providers: [CategoriasService],
})
export class CategoriasModule implements NestModule {
  /**
   * El middleware va **solo** a las rutas que mutan. `GET /categorias` queda
   * público: cualquiera puede ver el cementerio, solo el admin lo cambia.
   *
   * Se declara acá y no en `AppModule` para que la autorización viva al lado
   * de lo que protege. Nest monta los middlewares ordenados por distancia del
   * módulo (raíz primero), así que la sesión ya está resuelta cuando este corre.
   */
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AdminMiddleware).forRoutes(
      { path: 'categorias', method: RequestMethod.POST },
      { path: 'categorias/:id', method: RequestMethod.PUT },
      { path: 'categorias/:id', method: RequestMethod.DELETE },
    );
  }
}
