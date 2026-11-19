import { describe, expect, it } from 'vitest'
import { validarFoto } from './validar-foto'

/** PNG mínimo con la firma y el IHDR que lee también el backend. */
function png(ancho: number, alto: number): File {
  const bytes = new Uint8Array(24)
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0)
  bytes.set([0x49, 0x48, 0x44, 0x52], 12)
  const vista = new DataView(bytes.buffer)
  vista.setUint32(16, ancho)
  vista.setUint32(20, alto)
  return new File([bytes], 'planta.png', { type: 'image/png' })
}

/** JPEG con un SOF directo; sobre el byte 3 vive el marcador. */
function jpeg(ancho: number, alto: number, marcador = 0xc0): File {
  const bytes = new Uint8Array([
    0xff, 0xd8,
    0xff, marcador,
    0x00, 0x11,
    0x08,
    (alto >> 8) & 0xff, alto & 0xff,
    (ancho >> 8) & 0xff, ancho & 0xff,
    0x01, 0x01, 0x11, 0x00,
    0xff, 0xd9,
  ])
  return new File([bytes], 'planta.jpg', { type: 'image/jpeg' })
}

function escribirLE(bytes: Uint8Array, offset: number, valor: number, tamano: number) {
  for (let i = 0; i < tamano; i += 1) {
    bytes[offset + i] = (valor >>> (8 * i)) & 0xff
  }
}

/** Los tres contenedores WebP que acepta el backend. */
function webp(formato: 'VP8X' | 'VP8L' | 'VP8 ', ancho: number, alto: number): File {
  const bytes = new Uint8Array(30)
  bytes.set([0x52, 0x49, 0x46, 0x46], 0)
  bytes.set([0x57, 0x45, 0x42, 0x50], 8)
  bytes.set([...formato].map((letra) => letra.charCodeAt(0)), 12)

  if (formato === 'VP8X') {
    escribirLE(bytes, 24, ancho - 1, 3)
    escribirLE(bytes, 27, alto - 1, 3)
  } else if (formato === 'VP8L') {
    bytes[20] = 0x2f
    escribirLE(bytes, 21, ((alto - 1) << 14) | (ancho - 1), 4)
  } else {
    bytes.set([0x9d, 0x01, 0x2a], 23)
    escribirLE(bytes, 26, ancho & 0x3fff, 2)
    escribirLE(bytes, 28, alto & 0x3fff, 2)
  }

  return new File([bytes], 'planta.webp', { type: 'image/webp' })
}

describe('validarFoto', () => {
  it('acepta un PNG dentro de los límites', async () => {
    expect(await validarFoto(png(400, 400))).toBeNull()
  })

  it('acepta JPEG base y progresivo', async () => {
    expect(await validarFoto(jpeg(400, 400))).toBeNull()
    expect(await validarFoto(jpeg(400, 400, 0xc2))).toBeNull()
  })

  it('acepta los tres formatos WebP', async () => {
    expect(await validarFoto(webp('VP8X', 400, 400))).toBeNull()
    expect(await validarFoto(webp('VP8L', 400, 400))).toBeNull()
    expect(await validarFoto(webp('VP8 ', 400, 400))).toBeNull()
  })

  it('rechaza un archivo que no es imagen aunque se llame .png', async () => {
    const texto = new File(['esto no es una imagen'], 'planta.png', { type: 'image/png' })

    expect(await validarFoto(texto)).toBe('La foto debe ser una imagen JPEG, PNG o WebP')
  })

  it('rechaza una imagen declarada cuyas dimensiones no se pueden leer', async () => {
    const bytes = new Uint8Array(24)
    bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0)
    const sinCabecera = new File([bytes], 'planta.png', { type: 'image/png' })

    expect(await validarFoto(sinCabecera)).toBe('No se pudieron leer las dimensiones de la foto')
  })

  it('rechaza un lado menor a 320 e incluye el tamaño real', async () => {
    expect(await validarFoto(png(319, 400))).toBe(
      'La foto es demasiado chica (319×400). Cada lado tiene que medir al menos 320 px.',
    )
  })

  it('rechaza más de 50 megapíxeles e incluye el tamaño real', async () => {
    expect(await validarFoto(png(8000, 8000))).toBe(
      'La foto tiene demasiados píxeles (8000×8000). El máximo es 50 megapíxeles.',
    )
  })

  it('rechaza más de 5 MB antes de leer la cabecera', async () => {
    const bytes = new Uint8Array(await png(400, 400).arrayBuffer())
    const grande = new File([bytes, 'x'.repeat(5 * 1024 * 1024)], 'grande.png', {
      type: 'image/png',
    })

    expect(await validarFoto(grande)).toBe('La foto no puede superar los 5 MB.')
  })
})
