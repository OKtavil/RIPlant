import {
  type MiddlewareConsumer,
  Module,
  type NestModule,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CategoriasModule } from './categorias/categorias.module';
import { ComentariosModule } from './comentarios/comentarios.module';
import { LapidasModule } from './lapidas/lapidas.module';
import { SesionesModule } from './sesiones/sesiones.module';
import { SesionesMiddleware } from './sesiones/sesiones.middleware';
import { UsuariosModule } from './usuarios/usuarios.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>(
          'MONGODB_URI',
          'mongodb://localhost:27018/riplanta',
        ),
      }),
    }),
    UsuariosModule,
    SesionesModule,
    LapidasModule,
    CategoriasModule,
    ComentariosModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  /**
   * Resolución de sesión para todas las rutas. Se registra desde el módulo raíz
   * (distancia 0), así que Nest la monta **antes** que los middlewares de
   * módulos más lejanos: cuando `AdminMiddleware` corre, `req.sesion` ya está.
   */
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(SesionesMiddleware).forRoutes('*');
  }
}
