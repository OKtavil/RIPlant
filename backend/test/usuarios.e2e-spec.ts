import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { AppModule } from '../src/app.module';
import { applyValidationPipe } from '../src/shared/validation-pipe';
import { UsuarioDocumentModel } from '../src/usuarios/usuario.schema';
import { SesionDocumentModel } from '../src/sesiones/sesion.schema';
import { borrarBaseAislada, prepararBaseAislada } from './helpers/base-datos';

describe('Usuarios (e2e)', () => {
  let app: INestApplication;
  const sufijo = `${Date.now()}`;
  const nombreNuevo = `jardinero-${sufijo}`;
  let baseDatos: string;

  beforeAll(async () => {
    // R3-e2e-shared-db: base propia, para no escribir en la de desarrollo.
    baseDatos = prepararBaseAislada();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    applyValidationPipe(app);
    await app.init();
  });

  afterAll(async () => {
    const usuariosModel = app.get(getModelToken(UsuarioDocumentModel.name));
    const creados = await usuariosModel
      .find({ username: { $regex: sufijo } })
      .lean();
    await app
      .get(getModelToken(SesionDocumentModel.name))
      .deleteMany({ usuarioId: { $in: creados.map((u) => u._id) } });
    await usuariosModel.deleteMany({ username: { $regex: sufijo } });
    await app.close();

    await borrarBaseAislada(baseDatos);
  });

  it('should register an account, auto-login and never leak the hash', async () => {
    const res = await request(app.getHttpServer())
      .post('/usuarios')
      .send({ username: nombreNuevo, password: 'clave-larga-1' })
      .expect(201);

    expect(res.body).toMatchObject({
      username: nombreNuevo,
      rol: 'usuario',
      id: expect.any(String),
    });
    expect(JSON.stringify(res.body)).not.toContain('$2b$');

    // Auto-login: la misma cookie que deja `POST /sesiones`.
    const setCookie = res.headers['set-cookie'];
    const cookie = Array.isArray(setCookie)
      ? setCookie.join(';')
      : String(setCookie ?? '');
    expect(cookie).toContain('riplanta_sesion=');
    expect(cookie).toContain('HttpOnly');

    await request(app.getHttpServer())
      .get('/sesiones/actual')
      .set('Cookie', cookie)
      .expect(200)
      .expect((actual) => {
        expect(actual.body).toMatchObject({
          username: nombreNuevo,
          rol: 'usuario',
        });
      });

    // La contraseña quedó hasheada, no en claro.
    const guardado = await app
      .get(getModelToken(UsuarioDocumentModel.name))
      .findOne({ username: nombreNuevo })
      .lean();
    expect(guardado?.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(guardado?.passwordHash).not.toContain('clave-larga-1');
  });

  it('should force the usuario role even when the body asks for admin', async () => {
    const nombreTramposo = `tramposo-${sufijo}`;

    const res = await request(app.getHttpServer())
      .post('/usuarios')
      .send({
        username: nombreTramposo,
        password: 'clave-larga-1',
        rol: 'admin',
      })
      .expect(201);

    expect(res.body.rol).toBe('usuario');
  });

  it('should reject a duplicate username with 409', async () => {
    await request(app.getHttpServer())
      .post('/usuarios')
      .send({ username: nombreNuevo, password: 'otra-clave-1' })
      .expect(409);
  });

  it('should reject the reserved usernames with 400', async () => {
    for (const reservado of ['admin', 'zombie']) {
      await request(app.getHttpServer())
        .post('/usuarios')
        .send({ username: reservado, password: 'clave-larga-1' })
        .expect(400);
    }
  });

  it('should reject an invalid payload with 400', async () => {
    await request(app.getHttpServer()).post('/usuarios').send({}).expect(400);

    await request(app.getHttpServer())
      .post('/usuarios')
      .send({ username: `corta-${sufijo}`, password: 'corta' })
      .expect(400);

    // V001: un usuario de solo espacios pasaba el `IsNotEmpty` y el `trim`
    // posterior lo dejaba en `''`, que terminaba en un 500 del schema.
    await request(app.getHttpServer())
      .post('/usuarios')
      .send({ username: '   ', password: 'clave-larga-1' })
      .expect(400);

    // V001: el límite de 50 tiene que estar en el borde, no solo en el schema.
    await request(app.getHttpServer())
      .post('/usuarios')
      .send({ username: 'x'.repeat(51), password: 'clave-larga-1' })
      .expect(400);

    // El hash bcrypt trunca en 72 bytes: aceptar más sería mentir sobre la
    // contraseña que el usuario cree tener.
    await request(app.getHttpServer())
      .post('/usuarios')
      .send({ username: `larga-${sufijo}`, password: 'x'.repeat(73) })
      .expect(400);
  });

  describe('Perfiles públicos y descripción', () => {
    const nombrePerfil = `perfil-${sufijo}`;
    const nombreOtra = `perfil-otra-${sufijo}`;
    let idPerfil: string;
    let cookiePerfil: string;
    let cookieOtra: string;

    function cookieDe(res: { headers: Record<string, string | string[] | undefined> }): string {
      const setCookie = res.headers['set-cookie'];
      return Array.isArray(setCookie) ? setCookie.join(';') : String(setCookie ?? '');
    }

    beforeAll(async () => {
      const creado = await request(app.getHttpServer())
        .post('/usuarios')
        .send({ username: nombrePerfil, password: 'clave-larga-1' })
        .expect(201);
      idPerfil = creado.body.id;
      cookiePerfil = cookieDe(creado);

      const otra = await request(app.getHttpServer())
        .post('/usuarios')
        .send({ username: nombreOtra, password: 'clave-larga-1' })
        .expect(201);
      cookieOtra = cookieDe(otra);
    });

    it('el dueño edita su descripción y la sesión la refleja', async () => {
      const texto = 'A dave le gustan los tacos, ¿quieres uno?';

      const actualizado = await request(app.getHttpServer())
        .put(`/usuarios/${idPerfil}/descripcion`)
        .set('Cookie', cookiePerfil)
        .send({ descripcion: texto })
        .expect(200);
      expect(actualizado.body).toMatchObject({ username: nombrePerfil, descripcion: texto });

      const sesion = await request(app.getHttpServer())
        .get('/sesiones/actual')
        .set('Cookie', cookiePerfil)
        .expect(200);
      expect(sesion.body.descripcion).toBe(texto);

      // La cadena vacía es válida: borrar la descripción.
      const vacia = await request(app.getHttpServer())
        .put(`/usuarios/${idPerfil}/descripcion`)
        .set('Cookie', cookiePerfil)
        .send({ descripcion: '' })
        .expect(200);
      expect(vacia.body.descripcion).toBe('');
    });

    it('un tercero no puede editar la descripción y el payload inválido es 400', async () => {
      await request(app.getHttpServer())
        .put(`/usuarios/${idPerfil}/descripcion`)
        .set('Cookie', cookieOtra)
        .send({ descripcion: 'no debería poder' })
        .expect(403);

      await request(app.getHttpServer())
        .put(`/usuarios/${idPerfil}/descripcion`)
        .send({ descripcion: 'sin sesión' })
        .expect(401);

      await request(app.getHttpServer())
        .put(`/usuarios/${idPerfil}/descripcion`)
        .set('Cookie', cookiePerfil)
        .send({ descripcion: 'x'.repeat(281) })
        .expect(400);

      await request(app.getHttpServer())
        .put(`/usuarios/${idPerfil}/descripcion`)
        .set('Cookie', cookiePerfil)
        .send({ descripcion: 42 })
        .expect(400);
    });

    it('lista y muestra perfiles, sin la cuenta reservada zombie', async () => {
      const lista = await request(app.getHttpServer()).get('/usuarios').expect(200);
      expect(lista.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ username: nombrePerfil, descripcion: expect.any(String) }),
        ]),
      );
      expect(
        (lista.body as Array<{ username: string }>).some((u) => u.username === 'zombie'),
      ).toBe(false);

      const uno = await request(app.getHttpServer())
        .get(`/usuarios/${idPerfil}`)
        .expect(200);
      expect(uno.body).toMatchObject({ username: nombrePerfil });

      // Un id que no es ObjectId es 404, no un 500 de Mongoose.
      await request(app.getHttpServer()).get('/usuarios/no-es-un-id').expect(404);
    });
  });
});
