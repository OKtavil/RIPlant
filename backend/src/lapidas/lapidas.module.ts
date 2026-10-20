import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { LapidasController } from './lapidas.controller';
import { LapidasService } from './lapidas.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ComentarioDocumentModel, ComentarioSchema } from '../comentarios/comentario.schema';
import { CoronaDocumentModel, CoronaSchema } from './corona.schema';
import { LapidaDocumentModel, LapidaSchema } from './lapida.schema';
import { UsuarioDocumentModel, UsuarioSchema } from '../usuarios/usuario.schema';
import { DuenoOAdminLapidaMiddleware } from '../sesiones/dueno-o-admin-lapida.middleware';
import { SesionRequeridaMiddleware } from '../sesiones/sesion-requerida.middleware';
import { SesionesModule } from '../sesiones/sesiones.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LapidaDocumentModel.name, schema: LapidaSchema },
      { name: UsuarioDocumentModel.name, schema: UsuarioSchema },
      { name: CoronaDocumentModel.name, schema: CoronaSchema },
      // S6: al borrar una lápida se borran sus comentarios (cascada).
      { name: ComentarioDocumentModel.name, schema: ComentarioSchema },
    ]),
    SesionesModule,
  ],
  controllers: [LapidasController],
  providers: [
    LapidasService,
    DuenoOAdminLapidaMiddleware,
    SesionRequeridaMiddleware,
  ],
})
export class LapidasModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // POST /lapidas y POST /lapidas/:id/corona exigen sesión (cualquier rol).
    // PUT/DELETE /lapidas/:id exigen dueño o admin.
    // La sesión ya está resuelta por SesionesMiddleware global (AppModule).
    consumer
      .apply(SesionRequeridaMiddleware)
      .forRoutes(
        { path: 'lapidas', method: RequestMethod.POST },
        { path: 'lapidas/:id/corona', method: RequestMethod.POST },
      );
    consumer
      .apply(DuenoOAdminLapidaMiddleware)
      .forRoutes(
        { path: 'lapidas/:id', method: RequestMethod.PUT },
        { path: 'lapidas/:id', method: RequestMethod.DELETE },
      );
  }
}
