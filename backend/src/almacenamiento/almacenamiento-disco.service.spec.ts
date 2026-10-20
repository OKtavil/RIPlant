import { UnsupportedMediaTypeException } from '@nestjs/common';
import { mkdtemp, readFile, rm, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AlmacenamientoDiscoService, directorioDeSubidas } from './almacenamiento-disco.service';

/**
 * Fixtures reales de magic bytes, no inventadas: son los encabezados que
 * `file-type` reconoce. Un PNG, un JPEG y un WebP de verdad, más un GIF y un
 * texto plano para probar el rechazo.
 */
const PNG = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489',
  'hex',
);
const JPEG = Buffer.from(
  'ffd8ffe000104a46494600010100000100010000ffdb004300',
  'hex',
);
const WEBP = (() => {
  const b = Buffer.alloc(30);
  b.write('RIFF', 0, 'ascii');
  b.writeUInt32LE(22, 4);
  b.write('WEBP', 8, 'ascii');
  b.write('VP8 ', 12, 'ascii');
  return b;
})();
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
    // resolviera la ruta por su cuenta, alcanzaba con definir `UPLOADS_DIR`
    // para que la foto se guardara donde el estático no la busca y todo
    // respondiera 404 con la subida en 201.
    const original = process.env.UPLOADS_DIR;

    process.env.UPLOADS_DIR = '/tmp/opencode/dir-explícito';
    expect(directorioDeSubidas()).toBe('/tmp/opencode/dir-explícito');
    expect(new AlmacenamientoDiscoService()['directorio']).toBe(
      directorioDeSubidas(),
    );

    delete process.env.UPLOADS_DIR;
    expect(directorioDeSubidas()).toBe(
      join(process.cwd(), 'var', 'uploads'),
    );

    if (original === undefined) delete process.env.UPLOADS_DIR;
    else process.env.UPLOADS_DIR = original;
  });
});
