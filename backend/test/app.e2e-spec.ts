import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { applyValidationPipe } from '../src/shared/validation-pipe';
import { borrarBaseAislada, prepararBaseAislada } from './helpers/base-datos';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let baseDatos: string;

  beforeAll(() => {
    // R3-e2e-shared-db: base propia, para no escribir en la de desarrollo. Esta
    // suite monta y desmonta la app en cada test, así que la URI se fija una vez
    // acá y todos los montajes siguientes la heredan.
    baseDatos = prepararBaseAislada();
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    applyValidationPipe(app);
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await borrarBaseAislada(baseDatos);
  });
});
