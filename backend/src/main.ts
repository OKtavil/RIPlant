import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { applyValidationPipe } from './shared/validation-pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // `credentials: true` es obligatorio para que el browser acepte la cookie de
  // sesión. `origin: true` refleja el origen que pide; en producción conviene
  // una allowlist explícita en vez de reflejar cualquiera.
  app.enableCors({ origin: true, credentials: true });
  applyValidationPipe(app);
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
