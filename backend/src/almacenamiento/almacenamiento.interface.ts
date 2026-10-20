/**
 * Tipos de imagen aceptados (S8). El tipo real se detecta por magic bytes, no
 * por el `mimetype` que manda el cliente ni por la extensión del nombre.
 */
export const TIPOS_IMAGEN_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type TipoImagenPermitido = (typeof TIPOS_IMAGEN_PERMITIDOS)[number];

/** Extensión de archivo derivada del tipo detectado, nunca del nombre original. */
export const EXTENSION_POR_TIPO: Record<TipoImagenPermitido, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export interface ImagenGuardada {
  /** Nombre generado con `randomUUID()` más la extensión del tipo detectado. */
  nombreArchivo: string;
  /** Ruta pública relativa, la que se persiste en `fotoUrl`. */
  rutaPublica: string;
  tipo: TipoImagenPermitido;
  bytes: number;
}

/**
 * Contrato de almacenamiento de fotos. Las fotos viven hoy en disco local
 * (D2), pero el servicio queda detrás de esta interfaz para poder pasar a
 * S3/R2 sin tocar los controladores.
 */
export interface AlmacenamientoService {
  /**
   * Valida el contenido por magic bytes y lo guarda con un nombre generado.
   * Lanza `UnsupportedMediaTypeException` si el tipo real no es una imagen
   * permitida.
   */
  guardar(buffer: Buffer): Promise<ImagenGuardada>;

  /**
   * Borra un archivo por su ruta pública (`/uploads/<archivo>`). Best-effort:
   * un archivo que ya no está no es un error.
   */
  borrar(rutaPublica: string | undefined | null): Promise<void>;
}
