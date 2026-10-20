import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import {
  directorioDeSubidas,
  PREFIJO_PUBLICO_UPLOADS,
} from './almacenamiento/almacenamiento-disco.service';
import { applyValidationPipe } from './shared/validation-pipe';

async function bootstrap() {
  // S8: la app necesita el tipo express para poder montar el estático.
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // `credentials: true` es obligatorio para que el browser acepte la cookie de
  // sesión. `origin: true` refleja el origen que pide; en producción conviene
  // una allowlist explícita en vez de reflejar cualquiera.
  app.enableCors({ origin: true, credentials: true });
  applyValidationPipe(app);
  // S8: las fotos de `backend/var/uploads/` se sirven tal cual en `/uploads`.
  // Se usa la misma resolución de directorio que el servicio de almacenamiento:
  // si divergieran, la foto se guardaría donde nadie la sirve.
  app.useStaticAssets(directorioDeSubidas(), {
    prefix: `${PREFIJO_PUBLICO_UPLOADS}/`,
  });
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
