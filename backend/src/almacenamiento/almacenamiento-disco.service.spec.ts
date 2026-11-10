import { BadRequestException, UnsupportedMediaTypeException } from '@nestjs/common';
import { mkdtemp, readFile, rm, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AlmacenamientoDiscoService, directorioDeSubidas } from './almacenamiento-disco.service';

/**
 * Fixtures con cabecera real: `file-type` reconoce el tipo y el parser lee las
 * dimensiones que declara. Un PNG, un JPEG y un WebP válidos, más un GIF y un
 * texto plano para probar el rechazo.
 *
 * Tienen 640×480 y no 1×1 porque desde D003 una imagen por debajo del mínimo
 * se rechaza: un fixture de 1×1 ya no representa una foto que un usuario
 * podría subir.
 */
const ANCHO_VALIDO = 640;
const ALTO_VALIDO = 480;

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

function jpeg(ancho: number, alto: number): Buffer {
  const app0 = Buffer.from('ffe000104a46494600010100000100010000', 'hex');
  const segmento = Buffer.alloc(19);
  segmento.writeUInt16BE(0xffc0, 0);
  segmento.writeUInt16BE(17, 2);
  segmento[4] = 8;
  segmento.writeUInt16BE(alto, 5);
  segmento.writeUInt16BE(ancho, 7);
  segmento[9] = 3;
  return Buffer.concat([
    Buffer.from('ffd8', 'hex'),
    app0,
    segmento,
    Buffer.from('ffd9', 'hex'),
  ]);
}

function webp(ancho: number, alto: number): Buffer {
  const buffer = Buffer.alloc(30);
  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(22, 4);
  buffer.write('WEBP', 8, 'ascii');
  buffer.write('VP8X', 12, 'ascii');
  buffer.writeUInt32LE(10, 16);
  const anchoCrudo = ancho - 1;
  const altoCrudo = alto - 1;
  buffer[24] = anchoCrudo & 0xff;
  buffer[25] = (anchoCrudo >> 8) & 0xff;
  buffer[26] = (anchoCrudo >> 16) & 0xff;
  buffer[27] = altoCrudo & 0xff;
  buffer[28] = (altoCrudo >> 8) & 0xff;
  buffer[29] = (altoCrudo >> 16) & 0xff;
  return buffer;
}

const PNG = png(ANCHO_VALIDO, ALTO_VALIDO);
const JPEG = jpeg(ANCHO_VALIDO, ALTO_VALIDO);
const WEBP = webp(ANCHO_VALIDO, ALTO_VALIDO);
const GIF = Buffer.from('474946383961', 'hex');
const TEXTO = Buffer.from('esto no es una imagen en absoluto', 'utf8');

describe('AlmacenamientoDiscoService (S8)', () => {
  let cwdOriginal: string;
  let scratch: string;
  let service: AlmacenamientoDiscoService;

  beforeEach(async () => {
    // El servicio escribe relativo a `process.cwd()`. Para no ensuciar el
    // worktree, cada test corre dentro de un directorio temporal propio.
    cwdOriginal = process.cwd();
    scratch = await mkdtemp(join(tmpdir(), 'riplanta-uploads-'));
    process.chdir(scratch);
    service = new AlmacenamientoDiscoService();
  });

  afterEach(async () => {
    process.chdir(cwdOriginal);
    await rm(scratch, { recursive: true, force: true });
  });

  it('guarda un PNG con nombre UUID y extensión derivada del tipo real', async () => {
    const guardada = await service.guardar(PNG);

    expect(guardada.tipo).toBe('image/png');
    expect(guardada.rutaPublica).toMatch(/^\/uploads\/[0-9a-f-]{36}\.png$/);
    expect(guardada.bytes).toBe(PNG.length);
    expect(existsSync(join(scratch, 'var', 'uploads', guardada.nombreArchivo))).toBe(
      true,
    );
  });

  it('deriva la extensión del contenido, no del nombre que manda el cliente', async () => {
    // Un JPEG subido como "foto-maliciosa.png": manda el contenido.
    const guardada = await service.guardar(JPEG);
    expect(guardada.rutaPublica).toMatch(/\.jpg$/);
  });

  it('acepta WebP', async () => {
    const guardada = await service.guardar(WEBP);
    expect(guardada.rutaPublica).toMatch(/\.webp$/);
  });

  it('rechaza un archivo cuyo contenido no es una imagen permitida', async () => {
    await expect(service.guardar(GIF)).rejects.toBeInstanceOf(
      UnsupportedMediaTypeException,
    );
  });

  it('rechaza un texto plano disfrazado de imagen', async () => {
    await expect(service.guardar(TEXTO)).rejects.toBeInstanceOf(
      UnsupportedMediaTypeException,
    );
  });

  it('no deja archivo en disco cuando rechaza el tipo', async () => {
    await expect(service.guardar(GIF)).rejects.toBeInstanceOf(
      UnsupportedMediaTypeException,
    );
    const base = join(scratch, 'var', 'uploads');
    const archivos = existsSync(base) ? await readdir(base) : [];
    expect(archivos).toHaveLength(0);
  });

  describe('dimensiones (D003)', () => {
    it('rechaza una foto de menos de 320 px de lado', async () => {
      await expect(service.guardar(png(319, 400))).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(service.guardar(png(400, 319))).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('dice en el mensaje que el problema son las dimensiones', async () => {
      // Si el mensaje no lo aclara, el frontend solo puede mostrar "400" y la
      // persona no tiene forma de saber que su foto es demasiado chica.
      await expect(service.guardar(png(64, 64))).rejects.toThrow(
        /dimensiones|chica/i,
      );
    });

    it('acepta una foto justo en el mínimo', async () => {
      await expect(service.guardar(png(320, 320))).resolves.toBeDefined();
    });

    it('acepta una foto de 48 megapíxeles (una cámara de celular)', async () => {
      // 8000×6000 es el tamaño típico de un celular de 48 Mpx. El tope no debe
      // rechazar la foto que la gente realmente saca.
      const guardada = await service.guardar(png(8000, 6000));
      expect(guardada.tipo).toBe('image/png');
    });

    it('rechaza una imagen con más píxeles de los permitidos', async () => {
      await expect(service.guardar(png(8000, 7000))).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('no deja archivo en disco cuando rechaza por dimensiones', async () => {
      await expect(service.guardar(png(319, 400))).rejects.toBeInstanceOf(
        BadRequestException,
      );
      const base = join(scratch, 'var', 'uploads');
      const archivos = existsSync(base) ? await readdir(base) : [];
      expect(archivos).toHaveLength(0);
    });
  });

  it('genera un nombre distinto en cada guardado', async () => {
    const primera = await service.guardar(PNG);
    const segunda = await service.guardar(PNG);
    expect(primera.nombreArchivo).not.toBe(segunda.nombreArchivo);
  });

  it('borra el archivo por su ruta pública', async () => {
    const guardada = await service.guardar(PNG);
    const ruta = join(scratch, 'var', 'uploads', guardada.nombreArchivo);
    expect(await readFile(ruta)).toEqual(PNG);

    await service.borrar(guardada.rutaPublica);
    expect(existsSync(ruta)).toBe(false);
  });

  it('borrar es best-effort: no falla si el archivo no existe', async () => {
    await expect(service.borrar('/uploads/no-existe.png')).resolves.toBeUndefined();
    await expect(service.borrar(undefined)).resolves.toBeUndefined();
    await expect(service.borrar('')).resolves.toBeUndefined();
    await expect(service.borrar(null)).resolves.toBeUndefined();
  });

  it('ignora rutas que no están bajo /uploads (no borra fuera del directorio)', async () => {
    // Un `fotoUrl` manipulado no debe poder apuntar a otros archivos.
    await expect(service.borrar('/etc/passwd')).resolves.toBeUndefined();
    await expect(service.borrar('/uploads/../../package.json')).resolves.toBeUndefined();
    await expect(service.borrar('/uploads/sub/archivo.png')).resolves.toBeUndefined();
  });

  it('el directorio del servicio y el que monta main.ts son el mismo (regresión)', () => {
    // `main.ts` monta el estático con `directorioDeSubidas()`. Si el servicio
    // resolviera la ruta por su cuenta, alcanzaba con definir la variable para
    // que la foto se guardara donde el estático no la busca y todo respondiera
    // 404 con la subida en 201.
    const original = process.env.RIPLANTA_UPLOADS_DIR;

    process.env.RIPLANTA_UPLOADS_DIR = '/tmp/opencode/dir-explícito';
    expect(directorioDeSubidas()).toBe('/tmp/opencode/dir-explícito');
    expect(new AlmacenamientoDiscoService()['directorio']).toBe(
      directorioDeSubidas(),
    );

    delete process.env.RIPLANTA_UPLOADS_DIR;
    expect(directorioDeSubidas()).toBe(
      join(process.cwd(), 'var', 'uploads'),
    );

    if (original === undefined) delete process.env.RIPLANTA_UPLOADS_DIR;
    else process.env.RIPLANTA_UPLOADS_DIR = original;
  });

  it('ignora el nombre viejo UPLOADS_DIR (la costura se renombró)', () => {
    // Se renombró a `RIPLANTA_UPLOADS_DIR` para que no colisione con otro
    // servicio que use `UPLOADS_DIR` en el mismo entorno. El nombre viejo NO
    // debe seguir funcionando en silencio: si alguien lo deja definido, la
    // costura no se aplica y el test e2e escribiría en el worktree sin que
    // nadie lo note. Que falle fuerte es lo correcto.
    const viejo = process.env.UPLOADS_DIR;
    process.env.UPLOADS_DIR = '/tmp/opencode/ignorado';

    expect(directorioDeSubidas()).toBe(join(process.cwd(), 'var', 'uploads'));

    if (viejo === undefined) delete process.env.UPLOADS_DIR;
    else process.env.UPLOADS_DIR = viejo;
  });
});
