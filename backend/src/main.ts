import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { applyValidationPipe } from './shared/validation-pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  applyValidationPipe(app);
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
