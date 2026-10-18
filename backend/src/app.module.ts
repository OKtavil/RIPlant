import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LapidasModule } from './lapidas/lapidas.module';
import { CategoriasModule } from './categorias/categorias.module';

@Module({
  imports: [LapidasModule, CategoriasModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
