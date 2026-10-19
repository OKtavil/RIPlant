import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsuarioDocumentModel, UsuarioSchema } from './usuario.schema';
import { UsuariosService } from './usuarios.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UsuarioDocumentModel.name, schema: UsuarioSchema },
    ]),
  ],
  providers: [UsuariosService],
  exports: [UsuariosService],
})
export class UsuariosModule {}
