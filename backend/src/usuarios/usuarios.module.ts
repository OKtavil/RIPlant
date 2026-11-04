import { forwardRef, MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SesionesModule } from '../sesiones/sesiones.module';
import { UsuarioDocumentModel, UsuarioSchema } from './usuario.schema';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';
import { SesionRequeridaMiddleware } from '../sesiones/sesion-requerida.middleware';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UsuarioDocumentModel.name, schema: UsuarioSchema },
    ]),
    forwardRef(() => SesionesModule),
  ],
  controllers: [UsuariosController],
  providers: [UsuariosService, SesionRequeridaMiddleware],
  exports: [UsuariosService],
})
export class UsuariosModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SesionRequeridaMiddleware)
      .forRoutes({ path: 'usuarios/:id/descripcion', method: RequestMethod.PUT });
  }
}
