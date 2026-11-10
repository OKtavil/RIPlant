/**
 * Lectura de dimensiones de una imagen **sin decodificarla**.
 *
 * Solo se leen las cabeceras, así que el costo es constante y diminuto: una
 * imagen de 5 MB que se expande a cientos de megapíxeles se mide igual de
 * rápido que una de 320 px, y ninguna de las dos se descomprime en el servidor.
 * Eso es lo que hace segura esta validación: sin esto, el tope de 5 MB por
 * archivo acota los bytes comprimidos pero no la memoria que consumiría
 * decodificarla.
 *
 * Devuelve `null` cuando no puede determinar el tamaño. No se adivina: si el
 * tipo ya se validó por magic bytes, una cabecera ilegible es una imagen que
 * conviene rechazar.
 */

export type Dimensiones = {
  ancho: number;
  alto: number;
};

export function leerDimensiones(buffer: Buffer): Dimensiones | null {
  const dimensiones = leerPng(buffer) ?? leerJpeg(buffer) ?? leerWebp(buffer);
  if (!dimensiones) return null;
  // Un cero declarado no es una foto: el navegador no podría pintarla.
  if (dimensiones.ancho <= 0 || dimensiones.alto <= 0) return null;
  return dimensiones;
}

/** PNG: firma de 8 bytes y chunk `IHDR`, que siempre es el primero. */
function leerPng(buffer: Buffer): Dimensiones | null {
  if (buffer.length < 24) return null;
  if (
    buffer.readUInt32BE(0) !== 0x89504e47 ||
    buffer.readUInt32BE(4) !== 0x0d0a1a0a
  ) {
    return null;
  }
  if (buffer.toString('ascii', 12, 16) !== 'IHDR') return null;

  return { ancho: buffer.readUInt32BE(16), alto: buffer.readUInt32BE(20) };
}

/**
 * JPEG: se recorren los segmentos hasta el primer SOF. No se asume un offset
 * fijo porque entre SOI y SOF puede haber EXIF, XMP, un perfil ICC o varios
 * segmentos APPn de tamaño variable.
 */
function leerJpeg(buffer: Buffer): Dimensiones | null {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;

  let pos = 2;
  while (pos + 9 <= buffer.length) {
    if (buffer[pos] !== 0xff) return null;

    // Relleno: puede haber varios 0xff seguidos antes del marcador.
    while (pos < buffer.length && buffer[pos] === 0xff) pos += 1;
    if (pos >= buffer.length) return null;

    const marcador = buffer[pos];
    pos += 1;

    // Marcadores sin campo de longitud.
    if (marcador === 0x01 || (marcador >= 0xd0 && marcador <= 0xd8)) continue;
    // Fin de imagen, o inicio del barrido sin haber visto el SOF.
    if (marcador === 0xd9 || marcador === 0xda) return null;

    const longitud = buffer.readUInt16BE(pos);
    if (longitud < 2) return null;

    if (esSof(marcador)) {
      return {
        alto: buffer.readUInt16BE(pos + 3),
        ancho: buffer.readUInt16BE(pos + 5),
      };
    }

    pos += longitud;
  }

  return null;
}

/**
 * SOF0..SOF15, salteando los tres marcadores del rango que no describen el
 * tamaño: DHT (`0xc4`), JPG (`0xc8`) y DAC (`0xcc`). El progresivo es SOF2, así
 * que buscar solo SOF0 rechazaría fotos perfectamente válidas.
 */
function esSof(marcador: number): boolean {
  return (
    marcador >= 0xc0 &&
    marcador <= 0xcf &&
    marcador !== 0xc4 &&
    marcador !== 0xc8 &&
    marcador !== 0xcc
  );
}

/** WebP: contenedor RIFF con uno de los tres formatos posibles. */
function leerWebp(buffer: Buffer): Dimensiones | null {
  if (buffer.length < 16) return null;
  if (buffer.toString('ascii', 0, 4) !== 'RIFF') return null;
  if (buffer.toString('ascii', 8, 12) !== 'WEBP') return null;

  const formato = buffer.toString('ascii', 12, 16);

  // Extendido: ancho y alto de 24 bits little-endian, guardados como valor - 1.
  if (formato === 'VP8X') {
    if (buffer.length < 30) return null;
    return {
      ancho: buffer.readUIntLE(24, 3) + 1,
      alto: buffer.readUIntLE(27, 3) + 1,
    };
  }

  // Sin pérdida: firma 0x2f y 28 bits (14 por lado) empaquetados.
  if (formato === 'VP8L') {
    if (buffer.length < 25 || buffer[20] !== 0x2f) return null;
    const bits = buffer.readUInt32LE(21);
    return {
      ancho: (bits & 0x3fff) + 1,
      alto: ((bits >> 14) & 0x3fff) + 1,
    };
  }

  // Con pérdida: código de arranque 9d 01 2a y dos enteros de 14 bits útiles.
  if (formato === 'VP8 ') {
    if (buffer.length < 30) return null;
    if (buffer[23] !== 0x9d || buffer[24] !== 0x01 || buffer[25] !== 0x2a) {
      return null;
    }
    return {
      ancho: buffer.readUInt16LE(26) & 0x3fff,
      alto: buffer.readUInt16LE(28) & 0x3fff,
    };
  }

  return null;
}
