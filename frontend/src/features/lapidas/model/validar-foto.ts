/**
 * Validación de la foto antes de publicar la lápida.
 *
 * Espejo de las reglas del backend (`almacenamiento-disco.service.ts` y
 * `dimensiones-imagen.ts`): el tipo se decide por magic bytes, nunca por el
 * nombre ni el `mimetype` que manda el navegador, y las dimensiones se leen de
 * la cabecera sin decodificar la imagen. Así una foto rechazada se detecta
 * antes del `POST /lapidas`, en vez de publicar la lápida sin foto.
 */

/** Mismo tope que aplica multer en el backend (`TAMANIO_MAXIMO_FOTO`). */
export const TAMANIO_MAXIMO_FOTO = 5 * 1024 * 1024

const LADO_MINIMO_FOTO = 320
const PIXELES_MAXIMOS_FOTO = 50_000_000

const TIPO_IMAGEN = { PNG: 'png', JPEG: 'jpeg', WEBP: 'webp' } as const
type TipoImagen = (typeof TIPO_IMAGEN)[keyof typeof TIPO_IMAGEN]

interface Dimensiones {
  ancho: number
  alto: number
}

/** `null` significa que la foto entra; si no, devuelve el mensaje a mostrar. */
export async function validarFoto(archivo: File): Promise<string | null> {
  if (archivo.size > TAMANIO_MAXIMO_FOTO) {
    return 'La foto no puede superar los 5 MB.'
  }

  let bytes: Uint8Array
  try {
    bytes = new Uint8Array(await archivo.arrayBuffer())
  } catch {
    return 'No se pudo leer la foto. Probá con otro archivo.'
  }

  const tipo = detectarTipo(bytes)
  if (!tipo) return 'La foto debe ser una imagen JPEG, PNG o WebP'

  const dimensiones = leerDimensiones(bytes, tipo)
  if (!dimensiones) return 'No se pudieron leer las dimensiones de la foto'

  if (dimensiones.ancho < LADO_MINIMO_FOTO || dimensiones.alto < LADO_MINIMO_FOTO) {
    return (
      `La foto es demasiado chica (${dimensiones.ancho}×${dimensiones.alto}). ` +
      `Cada lado tiene que medir al menos ${LADO_MINIMO_FOTO} px.`
    )
  }

  if (dimensiones.ancho * dimensiones.alto > PIXELES_MAXIMOS_FOTO) {
    return (
      `La foto tiene demasiados píxeles (${dimensiones.ancho}×${dimensiones.alto}). ` +
      `El máximo es ${PIXELES_MAXIMOS_FOTO / 1_000_000} megapíxeles.`
    )
  }

  return null
}

function ascii(bytes: Uint8Array, inicio: number, fin: number): string {
  return String.fromCharCode(...bytes.subarray(inicio, fin))
}

function detectarTipo(bytes: Uint8Array): TipoImagen | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return TIPO_IMAGEN.PNG
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return TIPO_IMAGEN.JPEG
  }

  if (
    bytes.length >= 12 &&
    ascii(bytes, 0, 4) === 'RIFF' &&
    ascii(bytes, 8, 12) === 'WEBP'
  ) {
    return TIPO_IMAGEN.WEBP
  }

  return null
}

function leerDimensiones(bytes: Uint8Array, tipo: TipoImagen): Dimensiones | null {
  const dimensiones =
    tipo === TIPO_IMAGEN.PNG
      ? leerPng(bytes)
      : tipo === TIPO_IMAGEN.JPEG
        ? leerJpeg(bytes)
        : leerWebp(bytes)

  if (!dimensiones || dimensiones.ancho <= 0 || dimensiones.alto <= 0) return null
  return dimensiones
}

/** PNG: firma de 8 bytes y chunk `IHDR`, que siempre es el primero. */
function leerPng(bytes: Uint8Array): Dimensiones | null {
  if (bytes.length < 24 || ascii(bytes, 12, 16) !== 'IHDR') return null

  const vista = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return { ancho: vista.getUint32(16), alto: vista.getUint32(20) }
}

/** JPEG: se recorren los segmentos hasta el primer SOF, como en el backend. */
function leerJpeg(bytes: Uint8Array): Dimensiones | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null

  const vista = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let pos = 2
  while (pos + 9 <= bytes.length) {
    if (bytes[pos] !== 0xff) return null

    // Puede haber varios 0xff seguidos antes del marcador.
    while (pos < bytes.length && bytes[pos] === 0xff) pos += 1
    if (pos >= bytes.length) return null

    const marcador = bytes[pos]
    pos += 1

    if (marcador === 0x01 || (marcador >= 0xd0 && marcador <= 0xd8)) continue
    if (marcador === 0xd9 || marcador === 0xda) return null

    const longitud = vista.getUint16(pos)
    if (longitud < 2) return null

    if (esSof(marcador)) {
      return { alto: vista.getUint16(pos + 3), ancho: vista.getUint16(pos + 5) }
    }

    pos += longitud
  }

  return null
}

/** SOF0..SOF15, salteando DHT, JPG y DAC. El progresivo es SOF2. */
function esSof(marcador: number): boolean {
  return (
    marcador >= 0xc0 &&
    marcador <= 0xcf &&
    marcador !== 0xc4 &&
    marcador !== 0xc8 &&
    marcador !== 0xcc
  )
}

/** WebP: contenedor RIFF con uno de los tres formatos posibles. */
function leerWebp(bytes: Uint8Array): Dimensiones | null {
  if (bytes.length < 16) return null

  const formato = ascii(bytes, 12, 16)
  const vista = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)

  if (formato === 'VP8X') {
    if (bytes.length < 30) return null
    return {
      ancho: leerLE(bytes, 24, 3) + 1,
      alto: leerLE(bytes, 27, 3) + 1,
    }
  }

  if (formato === 'VP8L') {
    if (bytes.length < 25 || bytes[20] !== 0x2f) return null
    const bits = vista.getUint32(21, true)
    return {
      ancho: (bits & 0x3fff) + 1,
      alto: ((bits >> 14) & 0x3fff) + 1,
    }
  }

  if (formato === 'VP8 ') {
    if (bytes.length < 30) return null
    if (bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a) return null
    return {
      ancho: vista.getUint16(26, true) & 0x3fff,
      alto: vista.getUint16(28, true) & 0x3fff,
    }
  }

  return null
}

function leerLE(bytes: Uint8Array, offset: number, tamano: number): number {
  let valor = 0
  for (let i = 0; i < tamano; i += 1) {
    valor += bytes[offset + i] * 2 ** (8 * i)
  }
  return valor
}
