import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { SesionDocumentModel, SesionSchema } from './sesion.schema';
import { SesionesController } from './sesiones.controller';
import { SesionesService } from './sesiones.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SesionDocumentModel.name, schema: SesionSchema },
    ]),
    UsuariosModule,
  ],
  controllers: [SesionesController],
  providers: [SesionesService],
  exports: [SesionesService],
})
export class SesionesModule {}
