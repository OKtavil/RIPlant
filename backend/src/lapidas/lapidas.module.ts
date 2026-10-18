import { Module } from '@nestjs/common';
import { LapidasController } from './lapidas.controller';
import { LapidasService } from './lapidas.service';

@Module({
  controllers: [LapidasController],
  providers: [LapidasService]
})
export class LapidasModule {}
