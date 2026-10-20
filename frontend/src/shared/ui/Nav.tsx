/**
 * Barra de navegación del prototipo.
 *
 * Las pantallas de autenticación no muestran navegación: usan `Nav` con
 * `items` vacío y solo se ve el logo.
 */

import type { ReactNode } from 'react'

export type Vista = 'inicio' | 'ranking' | 'publicar' | 'detalle' | 'perfil' | 'categorias'

const ETIQUETAS: Record<Vista, string> = {
  inicio: 'INICIO',
  ranking: 'RANKING',
  publicar: 'PUBLICAR',
  detalle: 'INICIO',
  perfil: 'PERFIL',
  categorias: 'CATEGORÍAS',
}

type Props = {
  /** Vista activa, para pintar el ítem en amarillo. `null` en auth. */
  activa?: Vista | null
  /** Ítems visibles. Vacío en las pantallas de autenticación. */
  items?: Vista[]
  onNavegar?: (vista: Vista) => void
  /**
   * Acciones de sesión (entrar, perfil, salir). El prototipo no las trae, pero
   * hacen falta; viven dentro del nav para que no queden colgando debajo.
   */
  acciones?: ReactNode
}

export function Nav({ activa = null, items = [], onNavegar, acciones }: Props) {
  return (
    <nav className="nav">
      <button className="nav__logo" onClick={() => onNavegar?.('inicio')}>
        R.I.PLANTA
      </button>
      {items.length > 0 && (
        <div className="nav__items">
          {items.map((vista) => (
            <button
              key={vista}
              className={`nav__item${activa === vista ? ' nav__item--activo' : ''}`}
              onClick={() => onNavegar?.(vista)}
              aria-current={activa === vista ? 'page' : undefined}
            >
              {ETIQUETAS[vista]}
            </button>
          ))}
        </div>
      )}
      {acciones && <div className="nav__acciones">{acciones}</div>}
    </nav>
  )
}
