import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { applyValidationPipe } from '../src/shared/validation-pipe';
import { UsuariosService } from '../src/usuarios/usuarios.service';
import { abrirSesion } from './helpers/auth';

describe('Lapidas (e2e)', () => {
  let app: INestApplication;
  const sufijo = `${Date.now()}`;
  const nombreUsuario = `lapida-user-${sufijo}`;
  let cookie: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    applyValidationPipe(app);
    await app.init();

    const usuarios = app.get(UsuariosService);
    await usuarios.crear({
      username: nombreUsuario,
      password: 'clave-larga-1',
      rol: 'usuario',
    });
    cookie = await abrirSesion(app, nombreUsuario, 'clave-larga-1');
  });

  afterAll(async () => {
    await app.close();
  });

  it('lists, creates and crowns a grave', async () => {
    const list = await request(app.getHttpServer()).get('/lapidas').expect(200);
    expect(list.body.length).toBeGreaterThanOrEqual(10);

    const created = await request(app.getHttpServer())
      .post('/lapidas')
      .set('Cookie', cookie)
      .send({
        nombrePlanta: 'Monstera',
        epitafio: 'Sus hojas fueron enormes.',
        fechaFallecimiento: '2025-01-01',
        categoriaId: 1,
        causaMuerte: 'Poca luz',
      })
      .expect(201);

    expect(created.body).toMatchObject({
      id: expect.any(Number),
      nombrePlanta: 'Monstera',
      coronasCount: 0,
      usuarioId: expect.any(String),
      autor: nombreUsuario,
    });

    const crowned = await request(app.getHttpServer())
      .post(`/lapidas/${created.body.id}/corona`)
      .expect(201);
    expect(crowned.body.coronasCount).toBe(1);
  });

  it('rejects invalid grave payloads and missing resources', async () => {
    await request(app.getHttpServer())
      .post('/lapidas')
      .set('Cookie', cookie)
      .send({ nombrePlanta: '', categoriaId: 'not-a-number' })
      .expect(400);

    await request(app.getHttpServer()).get('/lapidas/999').expect(404);
  });

  it('creates and updates a grave without a cause of death', async () => {
    const creada = await request(app.getHttpServer())
      .post('/lapidas')
      .set('Cookie', cookie)
      .send({
        nombrePlanta: 'Helecho',
        epitafio: 'Se desvaneció en silencio.',
        fechaFallecimiento: '2025-02-02',
        categoriaId: 1,
      })
      .expect(201);
    expect(creada.body.causaMuerte).toBe('');

    const editada = await request(app.getHttpServer())
      .put(`/lapidas/${creada.body.id}`)
      .set('Cookie', cookie)
      .send({
        nombrePlanta: 'Helecho',
        epitafio: 'Sigue acá.',
        fechaFallecimiento: '2025-02-02',
        categoriaId: 1,
      })
      .expect(200);
    expect(editada.body.causaMuerte).toBe('');

    // Un string vacío equivale a omitir el campo
    const vacia = await request(app.getHttpServer())
      .post('/lapidas')
      .set('Cookie', cookie)
      .send({
        nombrePlanta: 'Suculenta',
        epitafio: 'Nunca explicó qué pasó.',
        fechaFallecimiento: '2025-03-03',
        categoriaId: 1,
        causaMuerte: '',
      })
      .expect(201);
    expect(vacia.body.causaMuerte).toBe('');
  });
});
