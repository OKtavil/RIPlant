import {
  BadRequestException,
  Injectable,
  Logger,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { leerDimensiones } from './dimensiones-imagen';
import {
  EXTENSION_POR_TIPO,
  TIPOS_IMAGEN_PERMITIDOS,
  type AlmacenamientoService,
  type ImagenGuardada,
  type TipoImagenPermitido,
} from './almacenamiento.interface';

/** Prefijo público bajo el que se sirven las fotos (montado en `main.ts`). */
export const PREFIJO_PUBLICO_UPLOADS = '/uploads';

/**
 * Ruta relativa a la raíz del backend donde viven las fotos, bajo `var/`.
 * `main.ts` la usa para montar el estático; el servicio, para escribir.
 */
export const RUTA_FISICA_UPLOADS = join('var', 'uploads');

/** Tope de tamaño por archivo (S8). */
export const TAMANIO_MAXIMO_FOTO = 5 * 1024 * 1024;

/**
 * Lado mínimo de la foto (D003). La ficha del detalle la muestra a 320 px de
 * alto, así que por debajo de eso la imagen se ve borrosa incluso a 1x. El
 * mínimo no pretende juzgar la foto: separa una foto de un icono o un sticker.
 */
export const LADO_MINIMO_FOTO = 320;

/**
 * Tope de píxeles totales (D003). El tope de 5 MB acota los bytes comprimidos,
 * **no** lo que ocupa la imagen decodificada: un PNG de unos pocos KB puede
 * declarar 50000×50000 y expandirse a gigabytes en el navegador de quien la
 * abra. 50 megapíxeles es más que los 48 Mpx de un celular actual, así que no
 * rechaza la foto que la gente saca de verdad.
 */
export const PIXELES_MAXIMOS_FOTO = 50_000_000;

/**
 * Directorio físico de las subidas. Es la única fuente de verdad: el servicio
 * escribe acá y `main.ts` monta el estático desde acá. Si el servidor y el
 * estático resolvieran la ruta por separado, una configuración distinta entre
 * ambos haría que la foto se guarde donde nadie la sirve.
 *
 * **`RIPLANTA_UPLOADS_DIR` es una costura, no configuración de despliegue.**
 * Hoy nadie la define en producción: existe para que los e2e apunten las fotos
 * a un temporal y no ensucien el worktree (ver `test/lapidas.e2e-spec.ts`). Se
 * documenta como costura en el README para no prometerla como variable
 * soportada, y por eso **no** está en `.env.example`: quien la defina sin
 * querer mueve el directorio de las fotos en silencio.
 *
 * El prefijo `RIPLANTA_` es deliberado aunque el resto de las variables
 * (`MONGODB_URI`, `PORT`, `ADMIN_*`) no lo lleve: `UPLOADS_DIR` es un nombre
 * genérico y colisiona con cualquier otro servicio que lo use en el mismo
 * entorno — un `.env` compartido, un `docker-compose` con varias apps, un shell
 * que la tenga exportada. Con el prefijo, la colisión es imposible.
 */
export function directorioDeSubidas(): string {
  return (
    process.env.RIPLANTA_UPLOADS_DIR ??
    join(process.cwd(), RUTA_FISICA_UPLOADS)
  );
}

/**
 * Almacenamiento en disco local (D2). Escribe en `backend/var/uploads/`, una
 * carpeta ignorada por git, y devuelve la ruta pública relativa.
 */
@Injectable()
export class AlmacenamientoDiscoService implements AlmacenamientoService {
  private readonly logger = new Logger(AlmacenamientoDiscoService.name);

  /**
   * Raíz física de las subidas. Por defecto `<backend>/var/uploads`;
   * `RIPLANTA_UPLOADS_DIR` la puede mover (los e2e la apuntan a un temporal para
   * no escribir en el worktree). Es una costura de test, no config de
   * despliegue: ver `directorioDeSubidas()`.
   */
  private readonly directorio = directorioDeSubidas();

  async guardar(buffer: Buffer): Promise<ImagenGuardada> {
    const tipo = await this.detectarTipo(buffer);
    this.validarDimensiones(buffer);

    const nombreArchivo = `${randomUUID()}.${EXTENSION_POR_TIPO[tipo]}`;
    await mkdir(this.directorio, { recursive: true });
    await writeFile(join(this.directorio, nombreArchivo), buffer);

    return {
      nombreArchivo,
      rutaPublica: `${PREFIJO_PUBLICO_UPLOADS}/${nombreArchivo}`,
      tipo,
      bytes: buffer.length,
    };
  }

  async borrar(rutaPublica: string | undefined | null): Promise<void> {
    const nombreArchivo = this.nombreDesdeRuta(rutaPublica);
    if (!nombreArchivo) return;

    try {
      await rm(join(this.directorio, nombreArchivo));
    } catch (error) {
      // Best-effort (S8): el archivo pudo borrarse antes o nunca existir.
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.logger.warn(
          `No se pudo borrar la foto ${nombreArchivo}: ${(error as Error).message}`,
        );
      }
    }
  }

  /**
   * Rechaza fotos cuyas dimensiones declaradas no sirven como foto de la
   * lápida (D003). Se lee la cabecera, nunca se decodifica la imagen.
   *
   * Los mensajes incluyen el tamaño real: sin eso, quien sube la foto solo ve
   * "400" y no tiene forma de saber qué corregir.
   */
  private validarDimensiones(buffer: Buffer): void {
    const dimensiones = leerDimensiones(buffer);

    if (!dimensiones) {
      throw new UnsupportedMediaTypeException(
        'No se pudieron leer las dimensiones de la foto',
      );
    }

    if (
      dimensiones.ancho < LADO_MINIMO_FOTO ||
      dimensiones.alto < LADO_MINIMO_FOTO
    ) {
      throw new BadRequestException(
        `La foto es demasiado chica (${dimensiones.ancho}×${dimensiones.alto}). ` +
          `Cada lado tiene que medir al menos ${LADO_MINIMO_FOTO} px.`,
      );
    }

    if (dimensiones.ancho * dimensiones.alto > PIXELES_MAXIMOS_FOTO) {
      throw new BadRequestException(
        `La foto tiene demasiados píxeles (${dimensiones.ancho}×${dimensiones.alto}). ` +
          `El máximo es ${PIXELES_MAXIMOS_FOTO / 1_000_000} megapíxeles.`,
      );
    }
  }

  /**
   * Detecta el tipo real por magic bytes. El `mimetype` del cliente y la
   * extensión del nombre original son datos que el cliente controla, así que
   * no se usan para decidir.
   */
  private async detectarTipo(buffer: Buffer): Promise<TipoImagenPermitido> {
    const { fileTypeFromBuffer } = await import('file-type');
    const detectado = await fileTypeFromBuffer(buffer);

    if (!detectado || !esTipoPermitido(detectado.mime)) {
      throw new UnsupportedMediaTypeException(
        'La foto debe ser una imagen JPEG, PNG o WebP',
      );
    }

    return detectado.mime;
  }

  /**
   * Extrae el nombre de archivo de una ruta pública. Solo acepta rutas bajo
   * `/uploads/` sin separadores: evita que un `fotoUrl` manipulado apunte
   * fuera del directorio de subidas.
   */
  private nombreDesdeRuta(rutaPublica: string | undefined | null): string | null {
    if (!rutaPublica) return null;
    if (!rutaPublica.startsWith(`${PREFIJO_PUBLICO_UPLOADS}/`)) return null;

    const nombreArchivo = rutaPublica.slice(PREFIJO_PUBLICO_UPLOADS.length + 1);
    if (!nombreArchivo || nombreArchivo.includes('/') || nombreArchivo.includes('..')) {
      return null;
    }
    return nombreArchivo;
  }
}

function esTipoPermitido(mime: string): mime is TipoImagenPermitido {
  return (TIPOS_IMAGEN_PERMITIDOS as readonly string[]).includes(mime);
}
