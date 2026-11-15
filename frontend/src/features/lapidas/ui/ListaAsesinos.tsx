import { rutaDePerfil } from '../../../app/ruta'
import { Aviso, AvisoNoDisponible } from '../../../shared/ui/Aviso'
import { Enlace } from '../../../shared/ui/Enlace'
import { IconoCalavera } from '../../../shared/ui/iconos'
import type { Asesino } from '../model/lapida'

type Props = {
  asesinos: Asesino[]
  /** `sidebar` para la barra de Inicio; `fila` para el ranking de dos columnas. */
  variante: 'sidebar' | 'fila'
  /** Nombre a resaltar, para marcar la fila propia en el perfil. */
  resaltar?: string
  /** Navegación interna de los links de la barra; sin esto, carga la página. */
  onNavegar?: (destino: string) => void
}

/**
 * Ranking de "asesinos seriales" (`GET /lapidas/asesinos`), compartido por
 * Inicio, Ranking y Perfil para no triplicar la regla.
 *
 * El backend agrupa por `usuarioId` y resuelve el nombre contra
 * `usuarios.username`. No se recalcula en cliente: `autor` es texto libre y
 * agrupar por él daría cuentas distintas a las reales.
 */
export function ListaAsesinos({ asesinos, variante, resaltar, onNavegar }: Props) {
  if (asesinos.length === 0) {
    return (
      <AvisoNoDisponible>Todavía no hay plantas asesinadas que rankear.</AvisoNoDisponible>
    )
  }

  if (variante === 'sidebar') {
    return (
      <>
        {asesinos.map((asesino, indice) => (
          <Enlace
            key={asesino.username}
            href={rutaDePerfil(asesino.username)}
            onNavegar={onNavegar}
            className="sidebar__fila"
          >
            <span>
              {indice + 1}. @{asesino.username}
            </span>
            <span className="sidebar__valor sidebar__valor--rojo">
              <IconoCalavera size={10} />
              {asesino.muertes}
            </span>
          </Enlace>
        ))}
      </>
    )
  }

  return (
    <>
      {asesinos.map((asesino, indice) => (
        <Enlace
          key={asesino.username}
          href={rutaDePerfil(asesino.username)}
          onNavegar={onNavegar}
          className="ranking__fila"
          data-propio={resaltar === asesino.username ? 'true' : undefined}
        >
          <span>
            <span className="ranking__puesto">
              {indice + 1}. @{asesino.username}
            </span>
            <br />
            <span className="ranking__detalle">
              {asesino.muertes === 1 ? 'planta en el cementerio' : 'plantas en el cementerio'}
              {resaltar === asesino.username && ' · vos'}
            </span>
          </span>
          <span className="ranking__valor ranking__valor--rojo">
            <IconoCalavera />
            {asesino.muertes}
          </span>
        </Enlace>
      ))}
    </>
  )
}

/** Aviso de error de carga, con la misma copia en las tres pantallas. */
export function AvisoAsesinos({ children }: { children: React.ReactNode }) {
  return <Aviso tono="error">{children}</Aviso>
}
