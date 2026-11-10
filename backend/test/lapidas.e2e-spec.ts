import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { applyValidationPipe } from '../src/shared/validation-pipe';
import { UsuariosService } from '../src/usuarios/usuarios.service';
import { abrirSesion } from './helpers/auth';
import { borrarBaseAislada, prepararBaseAislada } from './helpers/base-datos';

// S8: las fotos de los e2e van a un temporal, nunca al worktree. Se define
// antes de importar AppModule para que el servicio lo lea al construirse.
// `RIPLANTA_UPLOADS_DIR` es la costura (renombrada desde `UPLOADS_DIR` para no
// colisionar con otro servicio que use ese nombre genérico).
const uploadsScratch = mkdtempSync(join(tmpdir(), 'riplanta-e2e-uploads-'));
process.env.RIPLANTA_UPLOADS_DIR = uploadsScratch;

describe('Lapidas (e2e)', () => {
  let app: INestApplication;
  const sufijo = `${Date.now()}`;
  const nombreUsuario = `lapida-user-${sufijo}`;
  const nombreCoronador = `lapida-coronador-${sufijo}`;
  let cookie: string;
  let cookieCoronador: string;
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

    const usuarios = app.get(UsuariosService);
    await usuarios.crear({
      username: nombreUsuario,
      password: 'clave-larga-1',
      rol: 'usuario',
    });
    await usuarios.crear({
      username: nombreCoronador,
      password: 'clave-larga-1',
      rol: 'usuario',
    });
    cookie = await abrirSesion(app, nombreUsuario, 'clave-larga-1');
    cookieCoronador = await abrirSesion(app, nombreCoronador, 'clave-larga-1');
  });

  afterAll(async () => {
    await app.close();
    rmSync(uploadsScratch, { recursive: true, force: true });
    await borrarBaseAislada(baseDatos);
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
      .set('Cookie', cookieCoronador)
      .expect(201);
    expect(crowned.body.coronasCount).toBe(1);
    expect(crowned.body.coronadaPorMi).toBe(true);

    // Idempotente: la segunda corona del mismo usuario no es un error.
    const again = await request(app.getHttpServer())
      .post(`/lapidas/${created.body.id}/corona`)
      .set('Cookie', cookieCoronador)
      .expect(200);
    expect(again.body.coronasCount).toBe(1);
    expect(again.body.coronadaPorMi).toBe(true);
  });

  it('alternates the corona with POST and DELETE, both idempotent', async () => {
    const creada = await request(app.getHttpServer())
      .post('/lapidas')
      .set('Cookie', cookie)
      .send({
        nombrePlanta: 'Toggle',
        epitafio: 'Una corona y otra no.',
        fechaFallecimiento: '2025-04-04',
        categoriaId: 1,
      })
      .expect(201);
    const id = creada.body.id;
    const ruta = `/lapidas/${id}/corona`;

    // Poner: 201, corona presente.
    const puesta = await request(app.getHttpServer())
      .post(ruta)
      .set('Cookie', cookieCoronador)
      .expect(201);
    expect(puesta.body).toMatchObject({ coronasCount: 1, coronadaPorMi: true });

    // Quitar: 200, contador en cero.
    const quitada = await request(app.getHttpServer())
      .delete(ruta)
      .set('Cookie', cookieCoronador)
      .expect(200);
    expect(quitada.body).toMatchObject({ coronasCount: 0, coronadaPorMi: false });

    // Quitar de nuevo: idempotente, el contador NO baja de cero.
    const otraVez = await request(app.getHttpServer())
      .delete(ruta)
      .set('Cookie', cookieCoronador)
      .expect(200);
    expect(otraVez.body).toMatchObject({ coronasCount: 0, coronadaPorMi: false });

    // Poner de nuevo: vuelve a 1, sin haber quedado desfasado.
    const repuesta = await request(app.getHttpServer())
      .post(ruta)
      .set('Cookie', cookieCoronador)
      .expect(201);
    expect(repuesta.body).toMatchObject({ coronasCount: 1, coronadaPorMi: true });
  });

  it('rejects crowning your own grave', async () => {
    // La regla vive en el backend: la UI deshabilita el botón, pero un cliente
    // directo tampoco puede saltársela.
    const creada = await request(app.getHttpServer())
      .post('/lapidas')
      .set('Cookie', cookie)
      .send({
        nombrePlanta: 'Propia',
        epitafio: 'Mi propia lápida.',
        fechaFallecimiento: '2025-04-05',
        categoriaId: 1,
      })
      .expect(201);

    const rechazo = await request(app.getHttpServer())
      .post(`/lapidas/${creada.body.id}/corona`)
      .set('Cookie', cookie)
      .expect(403);
    expect(rechazo.body.message).toBe('No podés coronarte a vos mismo');
  });

  it('requires a session to crown or uncrown', async () => {
    await request(app.getHttpServer())
      .post('/lapidas/1/corona')
      .expect(401);
    await request(app.getHttpServer())
      .delete('/lapidas/1/corona')
      .expect(401);
  });

  it('rejects invalid grave payloads and missing resources', async () => {
    await request(app.getHttpServer())
      .post('/lapidas')
      .set('Cookie', cookie)
      .send({ nombrePlanta: '', categoriaId: 'not-a-number' })
      .expect(400);

    await request(app.getHttpServer()).get('/lapidas/999').expect(404);
  });

  it('rejects blank texts and dates outside a sane range', async () => {
    // D001: `IsNotEmpty` solo mira la cadena vacía; `'   '` pasaba y se
    // guardaba como texto en blanco.
    const base = {
      nombrePlanta: 'Pepino',
      epitafio: 'Se fue',
      fechaFallecimiento: '2025-01-01',
      categoriaId: 1,
    };
    const manana = new Date();
    manana.setUTCDate(manana.getUTCDate() + 1);

    const invalidos = [
      { ...base, nombrePlanta: '   ' },
      { ...base, epitafio: '   ' },
      // E001: ni en el futuro ni antes de 1900.
      { ...base, fechaFallecimiento: manana.toISOString().slice(0, 10) },
      { ...base, fechaFallecimiento: '1899-12-31' },
    ];
    for (const invalido of invalidos) {
      await request(app.getHttpServer())
        .post('/lapidas')
        .set('Cookie', cookie)
        .send(invalido)
        .expect(400);
    }

    // D001: un comentario de solo espacios tampoco entra.
    const creada = await request(app.getHttpServer())
      .post('/lapidas')
      .set('Cookie', cookie)
      .send(base)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/lapidas/${creada.body.id}/comentarios`)
      .set('Cookie', cookie)
      .send({ texto: '   ' })
      .expect(400);
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

  describe('Insignia Superviviente Zombie (S1-S3)', () => {
    /** Crea una lápida propia y devuelve su id. */
    async function crearLapida(): Promise<number> {
      const res = await request(app.getHttpServer())
        .post('/lapidas')
        .set('Cookie', cookie)
        .send({
          nombrePlanta: 'Revivida',
          epitafio: 'Antes',
          fechaFallecimiento: '2025-05-05',
          categoriaId: 1,
        })
        .expect(201);
      return res.body.id;
    }

    /** La lápida tal como la devuelve el backend. */
    async function leer(id: number) {
      const res = await request(app.getHttpServer()).get(`/lapidas/${id}`).expect(200);
      return res.body;
    }

    /** Las insignias de la sesión vigente. */
    async function misInsignias() {
      const res = await request(app.getHttpServer())
        .get('/sesiones/actual')
        .set('Cookie', cookie)
        .expect(200);
      return res.body.insignias as Array<{
        codigo: string;
        lapidaId: number;
        obtenidaEn: string;
      }>;
    }

    it('una lápida nueva NO está resucitada', async () => {
      const id = await crearLapida();

      expect((await leer(id)).resucitada).toBe(false);
    });

    it('editar la lápida la revive y da la insignia al dueño', async () => {
      const id = await crearLapida();
      // La suite ya editó otras lápidas antes (tests de arriba), así que el
      // usuario puede tener insignias previas: se comprueba que esta lápida no
      // tenga la suya todavía, no que la lista arranque vacía.
      expect((await misInsignias()).some((i) => i.lapidaId === id)).toBe(false);

      const editada = await request(app.getHttpServer())
        .put(`/lapidas/${id}`)
        .set('Cookie', cookie)
        .send({
          nombrePlanta: 'Revivida',
          epitafio: 'Sigue acá',
          fechaFallecimiento: '2025-05-05',
          categoriaId: 1,
        })
        .expect(200);

      expect(editada.body.resucitada).toBe(true);
      expect(editada.body.resucitadaEn).toEqual(expect.any(String));

      const insignias = await misInsignias();
      const nueva = insignias.filter((i) => i.lapidaId === id);
      expect(nueva).toHaveLength(1);
      expect(nueva[0]).toMatchObject({
        codigo: 'superviviente-zombie',
        lapidaId: id,
      });
      expect(nueva[0].obtenidaEn).toEqual(expect.any(String));
    });

    it('editar dos veces no da la insignia dos veces ni mueve la fecha', async () => {
      const id = await crearLapida();
      const edicion = {
        nombrePlanta: 'Revivida',
        epitafio: 'Sigue acá',
        fechaFallecimiento: '2025-05-05',
        categoriaId: 1,
      };

      const primera = await request(app.getHttpServer())
        .put(`/lapidas/${id}`)
        .set('Cookie', cookie)
        .send(edicion)
        .expect(200);

      const segunda = await request(app.getHttpServer())
        .put(`/lapidas/${id}`)
        .set('Cookie', cookie)
        .send({ ...edicion, epitafio: 'Otra vez' })
        .expect(200);

      // La fecha es la del PRIMER rescate: la segunda edición no la mueve.
      expect(segunda.body.resucitadaEn).toBe(primera.body.resucitadaEn);
      expect(segunda.body.epitafio).toBe('Otra vez');

      // Y la insignia sigue siendo una sola entrada.
      const insignias = await misInsignias();
      expect(insignias.filter((i) => i.lapidaId === id)).toHaveLength(1);
    });

    it('una edición rechazada NO revive la lápida ni da la insignia', async () => {
      const id = await crearLapida();

      // `400`: el payload no valida. La revivida no puede ocurrir "de paso".
      await request(app.getHttpServer())
        .put(`/lapidas/${id}`)
        .set('Cookie', cookie)
        .send({ nombrePlanta: '', epitafio: '', fechaFallecimiento: 'no-es-fecha', categoriaId: 1 })
        .expect(400);

      expect((await leer(id)).resucitada).toBe(false);
      expect((await misInsignias()).some((i) => i.lapidaId === id)).toBe(false);
    });

    it('un tercero no puede revivir una lápida ajena', async () => {
      const id = await crearLapida();
      const otra = `insignia-ajena-${sufijo}`;
      const usuarios = app.get(UsuariosService);
      await usuarios.crear({ username: otra, password: 'clave-larga-1', rol: 'usuario' });
      const cookieAjena = await abrirSesion(app, otra, 'clave-larga-1');

      await request(app.getHttpServer())
        .put(`/lapidas/${id}`)
        .set('Cookie', cookieAjena)
        .send({
          nombrePlanta: 'Revivida',
          epitafio: 'Intento ajeno',
          fechaFallecimiento: '2025-05-05',
          categoriaId: 1,
        })
        .expect(403);

      expect((await leer(id)).resucitada).toBe(false);
    });

    it('revive con el botón explícito y es idempotente', async () => {
      const id = await crearLapida();

      const primera = await request(app.getHttpServer())
        .post(`/lapidas/${id}/revivir`)
        .set('Cookie', cookie)
        .expect(201);
      expect(primera.body).toMatchObject({ id, resucitada: true });
      expect(primera.body.resucitadaEn).toEqual(expect.any(String));

      // Revivir de nuevo no mueve la fecha ni agrega otra insignia.
      const segunda = await request(app.getHttpServer())
        .post(`/lapidas/${id}/revivir`)
        .set('Cookie', cookie)
        .expect(201);
      expect(segunda.body.resucitadaEn).toBe(primera.body.resucitadaEn);
      expect(
        (await misInsignias()).filter((i) => i.lapidaId === id),
      ).toHaveLength(1);
    });

    it('solo el dueño o un admin pueden revivir por endpoint', async () => {
      const id = await crearLapida();
      const otra = `revivir-ajena-${sufijo}`;
      const usuarios = app.get(UsuariosService);
      await usuarios.crear({ username: otra, password: 'clave-larga-1', rol: 'usuario' });
      const cookieAjena = await abrirSesion(app, otra, 'clave-larga-1');

      await request(app.getHttpServer())
        .post(`/lapidas/${id}/revivir`)
        .set('Cookie', cookieAjena)
        .expect(403);
      await request(app.getHttpServer()).post(`/lapidas/${id}/revivir`).expect(401);

      expect((await leer(id)).resucitada).toBe(false);
    });

    it('sin sesión no hay insignias que leer', async () => {
      await request(app.getHttpServer()).get('/sesiones/actual').expect(401);
    });
  });

  describe('POST /lapidas/:id/foto (S8)', () => {
    /**
     * PNG de 640×480 construido a mano: firma + IHDR. Es una foto plausible
     * (supera el mínimo de lado de D003) sin arrastrar un binario al repo.
     */
    function png(ancho: number, alto: number): Buffer {
      const buffer = Buffer.alloc(33);
      Buffer.from('89504e470d0a1a0a', 'hex').copy(buffer, 0);
      buffer.writeUInt32BE(13, 8);
      buffer.write('IHDR', 12, 'ascii');
      buffer.writeUInt32BE(ancho, 16);
      buffer.writeUInt32BE(alto, 20);
      buffer[24] = 8;
      buffer[25] = 6;
      return buffer;
    }

    const PNG = png(640, 480);
    const GIF = Buffer.from('474946383961', 'hex');

    /** Crea una lápida propia y devuelve su id. */
    async function crearLapida(): Promise<number> {
      const res = await request(app.getHttpServer())
        .post('/lapidas')
        .set('Cookie', cookie)
        .send({
          nombrePlanta: 'Foto',
          epitafio: 'Para la foto.',
          fechaFallecimiento: '2025-04-04',
          categoriaId: 1,
        })
        .expect(201);
      return res.body.id;
    }

    it('sube una foto y devuelve la ruta pública en fotoUrl', async () => {
      const id = await crearLapida();

      const subida = await request(app.getHttpServer())
        .post(`/lapidas/${id}/foto`)
        .set('Cookie', cookie)
        .attach('foto', PNG, 'foto.png')
        .expect(201);

      expect(subida.body.fotoUrl).toMatch(/^\/uploads\/[0-9a-f-]{36}\.png$/);
    });

    it('rechaza la subida sin sesión', async () => {
      const id = await crearLapida();

      await request(app.getHttpServer())
        .post(`/lapidas/${id}/foto`)
        .attach('foto', PNG, 'foto.png')
        .expect(401);
    });

    it('rechaza un archivo que no es una imagen permitida', async () => {
      const id = await crearLapida();

      await request(app.getHttpServer())
        .post(`/lapidas/${id}/foto`)
        .set('Cookie', cookie)
        .attach('foto', GIF, 'animado.gif')
        .expect(415);
    });

    it('rechaza la petición sin archivo', async () => {
      const id = await crearLapida();

      await request(app.getHttpServer())
        .post(`/lapidas/${id}/foto`)
        .set('Cookie', cookie)
        .field('foto', 'esto-no-es-un-archivo')
        .expect(400);
    });

    it('rechaza una foto por debajo del tamaño mínimo (D003)', async () => {
      const id = await crearLapida();

      const rechazo = await request(app.getHttpServer())
        .post(`/lapidas/${id}/foto`)
        .set('Cookie', cookie)
        .attach('foto', png(200, 150), 'chica.png')
        .expect(400);

      // El mensaje tiene que decir por qué: un 400 pelado no le sirve a nadie.
      expect(rechazo.body.message).toMatch(/demasiado chica/i);
      // Y la lápida no puede quedar con una foto a medias.
      const sinFoto = await request(app.getHttpServer()).get(`/lapidas/${id}`);
      expect(sinFoto.body.fotoUrl).toBe('');
    });

    it('rechaza una foto con más píxeles de los permitidos (D003)', async () => {
      const id = await crearLapida();

      const rechazo = await request(app.getHttpServer())
        .post(`/lapidas/${id}/foto`)
        .set('Cookie', cookie)
        .attach('foto', png(9000, 9000), 'enorme.png')
        .expect(400);

      expect(rechazo.body.message).toMatch(/demasiados píxeles/i);
    });

    it('404 en lápida inexistente y 403 en lápida ajena', async () => {
      await request(app.getHttpServer())
        .post('/lapidas/999999/foto')
        .set('Cookie', cookie)
        .attach('foto', PNG, 'foto.png')
        .expect(404);

      // Otra usuaria no puede subir foto a la lápida de `nombreUsuario`.
      const id = await crearLapida();
      const otra = `foto-ajena-${sufijo}`;
      const usuarios = app.get(UsuariosService);
      await usuarios.crear({ username: otra, password: 'clave-larga-1', rol: 'usuario' });
      const cookieAjena = await abrirSesion(app, otra, 'clave-larga-1');

      await request(app.getHttpServer())
        .post(`/lapidas/${id}/foto`)
        .set('Cookie', cookieAjena)
        .attach('foto', PNG, 'foto.png')
        .expect(403);
    });
  });
});
