import { Module } from '@nestjs/common';
import { LapidasController } from './lapidas.controller';
import { LapidasService } from './lapidas.service';
import { MongooseModule } from '@nestjs/mongoose';
import { LapidaDocumentModel, LapidaSchema } from './lapida.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LapidaDocumentModel.name, schema: LapidaSchema },
    ]),
  ],
  controllers: [LapidasController],
  providers: [LapidasService]
})
export class LapidasModule {}
