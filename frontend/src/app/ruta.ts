/**
 * Rutas por URL del frontend.
 *
 * Implementación propia sobre la History API en lugar de una librería de
 * routing: la app tiene seis rutas planas y `dependencies` son solo `react` y
 * `react-dom`, así que una dependencia de producción no se justifica todavía.
 *
 * Ver la nota de refactorización al pie de este archivo.
 */

import type { Vista } from '../shared/ui/Nav'

/** Qué pantalla corresponde a la URL actual. */
export type Ruta = { tipo: 'vista'; vista: Vista } | { tipo: 'detalle'; id: number }

const VISTAS: ReadonlyArray<Vista> = [
  'inicio',
  'ranking',
  'publicar',
  'perfil',
  'categorias',
]

/** La ruta de cada vista, para escribir en la barra de direcciones. */
const RUTAS: Record<Vista, string> = {
  inicio: '/',
  ranking: '/ranking',
  publicar: '/publicar',
  perfil: '/perfil',
  categorias: '/categorias',
  // `detalle` no es una vista navegable directa: depende de un id.
  detalle: '/',
}

const INICIO: Ruta = { tipo: 'vista', vista: 'inicio' }

/**
 * Traduce un pathname a la pantalla que corresponde.
 *
 * Nunca lanza: una ruta desconocida cae al inicio para que un link viejo o mal
 * escrito no deje la pantalla en blanco.
 */
export function parsearRuta(pathname: string): Ruta {
  // Sin query string ni barra final: `/ranking/?x=1` y `/ranking` son la misma.
  const limpio = pathname.split('?')[0]!.replace(/\/+$/, '')

  if (limpio === '') return INICIO

  const detalle = /^\/lapidas\/(.+)$/.exec(limpio)
  if (detalle) {
    const id = Number(detalle[1])
    // Solo enteros positivos: `/lapidas/abc`, `/lapidas/0` y `/lapidas/-3` no
    // son lápidas válidas y el backend las rechazaría con 400.
    if (!Number.isInteger(id) || id < 1) return INICIO
    return { tipo: 'detalle', id }
  }

  const vista = VISTAS.find((v) => RUTAS[v] === limpio)
  return vista ? { tipo: 'vista', vista } : INICIO
}

/** La URL de una vista, para navegar. */
export function rutaDeVista(vista: Vista): string {
  return RUTAS[vista]
}

/** La URL del detalle de una lápida. */
export function rutaDeDetalle(id: number): string {
  return `/lapidas/${id}`
}

/**
 * Nota de refactorización (decisión del usuario, 2026-10-20).
 *
 * Cuando el frontend se reescriba con arquitectura hexagonal —y en la rama de
 * aprendizaje manual— el routing debería migrar a `react-router-dom` 7.x:
 * aporta `useParams`, `Link`, rutas anidadas y blockers de navegación sin
 * mantener código propio, y aísla la History API detrás de su adaptador, que
 * encaja mejor con puertos y adaptadores que este `parsearRuta` a mano.
 *
 * Hoy no se usa porque agrega la primera dependencia de producción que no es
 * React. Migrar es acotado: `parsearRuta`/`rutaDeVista` son las dos únicas
 * funciones que tocan la URL, y el resto de la app consume `Ruta`.
 */
