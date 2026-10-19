import { INestApplication, ValidationPipe } from '@nestjs/common';

export function applyValidationPipe(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {},
    }),
  );
}
