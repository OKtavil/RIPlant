import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { applyValidationPipe } from '../src/shared/validation-pipe';
import { getModelToken } from '@nestjs/mongoose';
import { CategoriaDocumentModel } from '../src/categorias/categoria.schema';

describe('Categorias (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    applyValidationPipe(app);
    await app.init();
  });

  afterEach(async () => {
    await app
      .get(getModelToken(CategoriaDocumentModel.name))
      .deleteMany({});
    await app.close();
  });

  it('creates, updates and removes a category', async () => {
    const created = await request(app.getHttpServer())
      .post('/categorias')
      .send({ nombre: 'Temporal' })
      .expect(201);
    expect(created.body).toMatchObject({ id: expect.any(Number), nombre: 'Temporal' });

    const updated = await request(app.getHttpServer())
      .put(`/categorias/${created.body.id}`)
      .send({ nombre: 'Actualizada' })
      .expect(200);
    expect(updated.body.nombre).toBe('Actualizada');

    await request(app.getHttpServer())
      .delete(`/categorias/${created.body.id}`)
      .expect(200);
    await request(app.getHttpServer())
      .put(`/categorias/${created.body.id}`)
      .send({ nombre: 'Ya no existe' })
      .expect(404);
  });

  it('rejects invalid category payloads', async () => {
    await request(app.getHttpServer())
      .post('/categorias')
      .send({ nombre: 'a' })
      .expect(400);
  });
});
