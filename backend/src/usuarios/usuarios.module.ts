import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SesionesModule } from '../sesiones/sesiones.module';
import { UsuarioDocumentModel, UsuarioSchema } from './usuario.schema';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UsuarioDocumentModel.name, schema: UsuarioSchema },
    ]),
    forwardRef(() => SesionesModule),
  ],
  controllers: [UsuariosController],
  providers: [UsuariosService],
  exports: [UsuariosService],
})
export class UsuariosModule {}
