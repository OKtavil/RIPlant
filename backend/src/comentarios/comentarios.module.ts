import {
  type MiddlewareConsumer,
  Module,
  type NestModule,
  RequestMethod,
} from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LapidaDocumentModel, LapidaSchema } from '../lapidas/lapida.schema';
import { AdminMiddleware } from '../sesiones/admin.middleware';
import { SesionRequeridaMiddleware } from '../sesiones/sesion-requerida.middleware';
import { ComentarioDocumentModel, ComentarioSchema } from './comentario.schema';
import { ComentariosController } from './comentarios.controller';
import { ComentariosService } from './comentarios.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ComentarioDocumentModel.name, schema: ComentarioSchema },
      // S6: se lee la lápida para responder 404 antes de listar o comentar.
      { name: LapidaDocumentModel.name, schema: LapidaSchema },
    ]),
  ],
  controllers: [ComentariosController],
  providers: [ComentariosService],
})
export class ComentariosModule implements NestModule {
  /**
   * Quién pasa en cada uno de los tres endpoints de S6, declarado al lado de lo
   * que protege (mismo criterio que `CategoriasModule`). Nest monta los
   * middlewares ordenados por distancia del módulo, así que `SesionesMiddleware`
   * (raíz) ya resolvió la sesión cuando estos corren.
   *
   * - `GET` queda público: cualquiera puede leer un epitafio.
   * - `POST` pide sesión de cualquier rol.
   * - `DELETE` pide admin: el autor no borra el suyo (D5).
   */
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(SesionRequeridaMiddleware).forRoutes({
      path: 'lapidas/:id/comentarios',
      method: RequestMethod.POST,
    });
    consumer.apply(AdminMiddleware).forRoutes({
      path: 'comentarios/:id',
      method: RequestMethod.DELETE,
    });
  }
}
