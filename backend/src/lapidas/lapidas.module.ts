import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { LapidasController } from './lapidas.controller';
import { LapidasService } from './lapidas.service';
import { MongooseModule } from '@nestjs/mongoose';
import { LapidaDocumentModel, LapidaSchema } from './lapida.schema';
import { UsuarioDocumentModel, UsuarioSchema } from '../usuarios/usuario.schema';
import { DuenoOAdminLapidaMiddleware } from '../sesiones/dueno-o-admin-lapida.middleware';
import { SesionesModule } from '../sesiones/sesiones.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LapidaDocumentModel.name, schema: LapidaSchema },
      { name: UsuarioDocumentModel.name, schema: UsuarioSchema },
    ]),
    SesionesModule,
  ],
  controllers: [LapidasController],
  providers: [LapidasService, DuenoOAdminLapidaMiddleware],
})
export class LapidasModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // POST /lapidas exige sesión (cualquier rol logueado). PUT/DELETE exigen dueño o admin.
    // La sesión ya está resuelta por SesionesMiddleware global (AppModule).
    consumer
      .apply(DuenoOAdminLapidaMiddleware)
      .forRoutes(
        { path: 'lapidas/:id', method: RequestMethod.PUT },
        { path: 'lapidas/:id', method: RequestMethod.DELETE },
      );
  }
}

