import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { AppModule } from '../src/app.module';
import { applyValidationPipe } from '../src/shared/validation-pipe';
import { UsuariosService } from '../src/usuarios/usuarios.service';
import { UsuarioDocumentModel } from '../src/usuarios/usuario.schema';
import { CategoriaDocumentModel } from '../src/categorias/categoria.schema';
import { SesionDocumentModel } from '../src/sesiones/sesion.schema';
import { abrirSesion } from './helpers/auth';

describe('Categorias (e2e)', () => {
  let app: INestApplication;
  let cookieAdmin: string;
  const nombreAdmin = `admin-cat-${Date.now()}`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    applyValidationPipe(app);
    await app.init();

    await app.get(UsuariosService).crear({
      username: nombreAdmin,
      password: 'clave-admin',
      rol: 'admin',
    });
    cookieAdmin = await abrirSesion(app, nombreAdmin, 'clave-admin');
  });

  afterEach(async () => {
    await app
      .get(getModelToken(CategoriaDocumentModel.name))
      .deleteMany({});
  });

  afterAll(async () => {
    const usuariosModel = app.get(getModelToken(UsuarioDocumentModel.name));
    const creados = await usuariosModel.find({ username: nombreAdmin }).lean();
    await app
      .get(getModelToken(SesionDocumentModel.name))
      .deleteMany({ usuarioId: { $in: creados.map((u) => u._id) } });
    await usuariosModel.deleteMany({ username: nombreAdmin });
    await app.close();
  });

  it('creates, updates and removes a category', async () => {
    const created = await request(app.getHttpServer())
      .post('/categorias')
      .set('Cookie', cookieAdmin)
      .send({ nombre: 'Temporal' })
      .expect(201);
    expect(created.body).toMatchObject({ id: expect.any(Number), nombre: 'Temporal' });

    const updated = await request(app.getHttpServer())
      .put(`/categorias/${created.body.id}`)
      .set('Cookie', cookieAdmin)
      .send({ nombre: 'Actualizada' })
      .expect(200);
    expect(updated.body.nombre).toBe('Actualizada');

    await request(app.getHttpServer())
      .delete(`/categorias/${created.body.id}`)
      .set('Cookie', cookieAdmin)
      .expect(200);
    await request(app.getHttpServer())
      .put(`/categorias/${created.body.id}`)
      .set('Cookie', cookieAdmin)
      .send({ nombre: 'Ya no existe' })
      .expect(404);
  });

  it('rejects invalid category payloads', async () => {
    await request(app.getHttpServer())
      .post('/categorias')
      .set('Cookie', cookieAdmin)
      .send({ nombre: 'a' })
      .expect(400);
  });

  it('rejects mutations without an admin session', async () => {
    await request(app.getHttpServer())
      .post('/categorias')
      .send({ nombre: 'Sin sesion' })
      .expect(401);
  });

  it('still lists categories without a session', async () => {
    await request(app.getHttpServer()).get('/categorias').expect(200);
  });
});
