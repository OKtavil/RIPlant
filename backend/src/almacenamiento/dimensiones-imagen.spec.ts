import { leerDimensiones } from './dimensiones-imagen';

/**
 * Fixtures construidas a mano, no descargadas: solo la cabecera que hace falta
 * para leer el tamaño, sin decodificar un solo píxel. Eso es justamente lo que
 * hace segura la validación: se lee la cabecera, nunca se descomprime la imagen
 * entera, así que una bomba de descompresión no puede agotar la memoria.
 */

/** PNG: firma + chunk IHDR con ancho y alto big-endian. */
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

/** JPEG: SOI + APP0 JFIF + un segmento SOF (0xc0 baseline, 0xc2 progresivo). */
function jpeg(ancho: number, alto: number, sof = 0xc0): Buffer {
  const app0 = Buffer.from('ffe000104a46494600010100000100010000', 'hex');
  const segmento = Buffer.alloc(19);
  segmento.writeUInt16BE(0xff00 | sof, 0);
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

/** WebP extendido (VP8X): ancho y alto de 24 bits little-endian, menos uno. */
function webpVp8x(ancho: number, alto: number): Buffer {
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

/** WebP con pérdida (VP8 ): código de arranque 9d 01 2a y dos u16 con 14 bits útiles. */
function webpVp8(ancho: number, alto: number): Buffer {
  const buffer = Buffer.alloc(30);
  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(22, 4);
  buffer.write('WEBP', 8, 'ascii');
  buffer.write('VP8 ', 12, 'ascii');
  buffer.writeUInt32LE(10, 16);
  buffer[23] = 0x9d;
  buffer[24] = 0x01;
  buffer[25] = 0x2a;
  buffer.writeUInt16LE(ancho & 0x3fff, 26);
  buffer.writeUInt16LE(alto & 0x3fff, 28);
  return buffer;
}

/** WebP sin pérdida (VP8L): firma 0x2f y 28 bits repartidos en 4 bytes. */
function webpVp8l(ancho: number, alto: number): Buffer {
  const buffer = Buffer.alloc(25);
  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(17, 4);
  buffer.write('WEBP', 8, 'ascii');
  buffer.write('VP8L', 12, 'ascii');
  buffer.writeUInt32LE(5, 16);
  buffer[20] = 0x2f;
  const anchoCrudo = ancho - 1;
  const altoCrudo = alto - 1;
  buffer[21] = anchoCrudo & 0xff;
  buffer[22] = ((anchoCrudo >> 8) & 0x3f) | ((altoCrudo & 0x03) << 6);
  buffer[23] = (altoCrudo >> 2) & 0xff;
  buffer[24] = (altoCrudo >> 10) & 0x0f;
  return buffer;
}

describe('leerDimensiones', () => {
  it('lee el tamaño de un PNG desde IHDR', () => {
    expect(leerDimensiones(png(400, 300))).toEqual({ ancho: 400, alto: 300 });
  });

  it('lee el tamaño de un JPEG baseline desde SOF0', () => {
    expect(leerDimensiones(jpeg(640, 480))).toEqual({ ancho: 640, alto: 480 });
  });

  it('lee el tamaño de un JPEG progresivo desde SOF2', () => {
    // El progresivo no usa SOF0; si solo se buscara SOF0 se rechazaría una foto
    // perfectamente válida de un celular.
    expect(leerDimensiones(jpeg(1200, 900, 0xc2))).toEqual({
      ancho: 1200,
      alto: 900,
    });
  });

  it('salta los segmentos previos al SOF en vez de asumir su posición', () => {
    // APP0 (16 bytes) + APP1 EXIF de 40 bytes antes del SOF: un parser que lea
    // el SOF en un offset fijo devuelve basura.
    const exif = Buffer.alloc(42);
    exif.writeUInt16BE(0xffe1, 0);
    exif.writeUInt16BE(40, 2);
    const buffer = Buffer.concat([
      Buffer.from('ffd8ffd8', 'hex'),
      Buffer.from('ffe000104a46494600010100000100010000', 'hex'),
      exif,
      jpeg(500, 400).subarray(20),
    ]);
    expect(leerDimensiones(buffer)).toEqual({ ancho: 500, alto: 400 });
  });

  it('lee el tamaño de un WebP extendido (VP8X)', () => {
    expect(leerDimensiones(webpVp8x(400, 300))).toEqual({ ancho: 400, alto: 300 });
  });

  it('lee el tamaño de un WebP con pérdida (VP8 )', () => {
    expect(leerDimensiones(webpVp8(1024, 768))).toEqual({ ancho: 1024, alto: 768 });
  });

  it('lee el tamaño de un WebP sin pérdida (VP8L)', () => {
    expect(leerDimensiones(webpVp8l(800, 600))).toEqual({ ancho: 800, alto: 600 });
  });

  it('devuelve null con bytes que no son una imagen', () => {
    expect(leerDimensiones(Buffer.from('esto no es una imagen', 'utf8'))).toBeNull();
  });

  it('devuelve null con una cabecera truncada en vez de inventar un tamaño', () => {
    expect(leerDimensiones(png(400, 300).subarray(0, 20))).toBeNull();
    expect(leerDimensiones(jpeg(400, 300).subarray(0, 6))).toBeNull();
    expect(leerDimensiones(webpVp8x(400, 300).subarray(0, 23))).toBeNull();
  });

  it('devuelve null si el tamaño declarado es cero', () => {
    // Una imagen de 0 px no es una foto; aceptarla haría que el navegador
    // reciba un archivo que nunca puede pintar.
    expect(leerDimensiones(png(0, 300))).toBeNull();
    expect(leerDimensiones(png(300, 0))).toBeNull();
  });
});
