import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { AppModule } from '../src/app.module';
import { applyValidationPipe } from '../src/shared/validation-pipe';
import { UsuariosService } from '../src/usuarios/usuarios.service';
import { UsuarioDocumentModel } from '../src/usuarios/usuario.schema';
import { SesionDocumentModel } from '../src/sesiones/sesion.schema';
import { abrirSesion } from './helpers/auth';

describe('Sesiones (e2e)', () => {
  let app: INestApplication;
  const sufijo = `${Date.now()}`;
  const nombreAdmin = `admin-${sufijo}`;
  const nombreJardinero = `jardinero-${sufijo}`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    applyValidationPipe(app);
    await app.init();

    const usuarios = app.get(UsuariosService);
    await usuarios.crear({
      username: nombreAdmin,
      password: 'clave-admin',
      rol: 'admin',
    });
    await usuarios.crear({
      username: nombreJardinero,
      password: 'clave-jardinero',
      rol: 'usuario',
    });
  });

  afterAll(async () => {
    const usuariosModel = app.get(getModelToken(UsuarioDocumentModel.name));
    const creados = await usuariosModel
      .find({ username: { $in: [nombreAdmin, nombreJardinero] } })
      .lean();
    await app
      .get(getModelToken(SesionDocumentModel.name))
      .deleteMany({ usuarioId: { $in: creados.map((u) => u._id) } });
    await usuariosModel.deleteMany({
      username: { $in: [nombreAdmin, nombreJardinero] },
    });
    await app.close();
  });

  it('should reject invalid credentials with 401', async () => {
    await request(app.getHttpServer())
      .post('/sesiones')
      .send({ username: nombreAdmin, password: 'equivocada' })
      .expect(401);
  });

  it('should answer 429 after five failed attempts from the same origin', async () => {
    const credenciales = { username: `sospechoso-${sufijo}`, password: 'x' };
    const intentar = () =>
      request(app.getHttpServer()).post('/sesiones').send(credenciales);

    for (let intento = 0; intento < 5; intento += 1) {
      await intentar().expect(401);
    }

    await intentar().expect(429);
  });

  it('should reject an empty payload with 400', async () => {
    await request(app.getHttpServer()).post('/sesiones').send({}).expect(400);
  });

  it('should open a session with an httpOnly cookie and never leak the hash', async () => {
    const res = await request(app.getHttpServer())
      .post('/sesiones')
      .send({ username: nombreAdmin, password: 'clave-admin' })
      .expect(201);

    expect(res.body).toMatchObject({
      username: nombreAdmin,
      rol: 'admin',
      id: expect.any(String),
      expiraEn: expect.any(String),
    });
    expect(JSON.stringify(res.body)).not.toContain('$2b$');

    const cookie = res.headers['set-cookie'].join(';');
    expect(cookie).toContain('riplanta_sesion=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');
  });

  it('should read the current session and revoke it on logout', async () => {
    const cookie = await abrirSesion(app, nombreJardinero, 'clave-jardinero');

    const actual = await request(app.getHttpServer())
      .get('/sesiones/actual')
      .set('Cookie', cookie)
      .expect(200);
    expect(actual.body).toMatchObject({ username: nombreJardinero, rol: 'usuario' });

    await request(app.getHttpServer())
      .delete('/sesiones')
      .set('Cookie', cookie)
      .expect(204);

    await request(app.getHttpServer())
      .get('/sesiones/actual')
      .set('Cookie', cookie)
      .expect(401);
  });

  it('should return 401 on /sesiones/actual without a session', async () => {
    await request(app.getHttpServer()).get('/sesiones/actual').expect(401);
  });

  it('should treat a malformed session cookie as no session instead of failing', async () => {
    // Un valor con percent-encoding inválido hacía que decodeURIComponent
    // lanzara dentro del middleware de sesión: toda ruta que trajera esta
    // cookie respondía 500.
    const rota = 'riplanta_sesion=%E0%A4%A';

    await request(app.getHttpServer())
      .get('/categorias')
      .set('Cookie', rota)
      .expect(200);

    await request(app.getHttpServer())
      .get('/sesiones/actual')
      .set('Cookie', rota)
      .expect(401);

    await request(app.getHttpServer())
      .delete('/sesiones')
      .set('Cookie', rota)
      .expect(204);
  });

  describe('categorias protegidas por AdminMiddleware', () => {
    it('should return 401 when mutating without a session', async () => {
      await request(app.getHttpServer())
        .post('/categorias')
        .send({ nombre: 'Sin sesion' })
        .expect(401);
    });

    it('should return 403 when mutating with a non-admin session', async () => {
      const cookie = await abrirSesion(
        app,
        nombreJardinero,
        'clave-jardinero',
      );

      await request(app.getHttpServer())
        .post('/categorias')
        .set('Cookie', cookie)
        .send({ nombre: 'De jardinero' })
        .expect(403);
    });

    it('should allow an admin session to create, update and remove', async () => {
      const cookie = await abrirSesion(app, nombreAdmin, 'clave-admin');

      const creada = await request(app.getHttpServer())
        .post('/categorias')
        .set('Cookie', cookie)
        .send({ nombre: 'De admin' })
        .expect(201);

      await request(app.getHttpServer())
        .put(`/categorias/${creada.body.id}`)
        .set('Cookie', cookie)
        .send({ nombre: 'Renombrada' })
        .expect(200);

      await request(app.getHttpServer())
        .delete(`/categorias/${creada.body.id}`)
        .set('Cookie', cookie)
        .expect(200);
    });

    it('should keep GET /categorias public', async () => {
      await request(app.getHttpServer()).get('/categorias').expect(200);
    });
  });
});
