import { Global, Module } from '@nestjs/common';
import { AlmacenamientoDiscoService } from './almacenamiento-disco.service';
import { ALMACENAMIENTO } from './almacenamiento.token';

/**
 * Módulo global: `LapidasModule` inyecta el token `ALMACENAMIENTO`. Se
 * registra una sola vez acá y queda disponible en toda la app. Para pasar a
 * S3/R2 alcanza con cambiar el `useClass` de este provider.
 */
@Global()
@Module({
  providers: [
    { provide: ALMACENAMIENTO, useClass: AlmacenamientoDiscoService },
  ],
  exports: [ALMACENAMIENTO],
})
export class AlmacenamientoModule {}
