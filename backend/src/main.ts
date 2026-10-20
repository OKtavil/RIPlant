import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import {
  directorioDeSubidas,
  PREFIJO_PUBLICO_UPLOADS,
} from './almacenamiento/almacenamiento-disco.service';
import {
  corsOriginsPermitidos,
  saltosDeProxy,
} from './shared/config-despliegue';
import { applyValidationPipe } from './shared/validation-pipe';

async function bootstrap() {
  // S8: la app necesita el tipo express para poder montar el estático.
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // R1-003: `req.ip` es la clave del rate-limit de login. Detrás de un proxy
  // sin esto, todos los clientes comparten la IP del proxy y cinco fallos
  // ajenos bloquean a todos con ese usuario. Sin definir, no se confía en
  // ningún header (el default seguro): `X-Forwarded-For` falseado dejaría
  // saltear el rate-limit entero. Ver `config-despliegue.ts`.
  const saltos = saltosDeProxy();
  if (saltos !== false) {
    app.set('trust proxy', saltos);
  }

  // R1-002: `credentials: true` es obligatorio para que el browser acepte la
  // cookie de sesión. Sin allowlist definida se refleja el origen que pide (el
  // comportamiento de desarrollo, acotado por `SameSite=Lax`); con
  // `RIPLANTA_CORS_ORIGINS` se restringe a esa lista. Ver `config-despliegue.ts`.
  app.enableCors({
    origin: corsOriginsPermitidos(),
    credentials: true,
  });

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
