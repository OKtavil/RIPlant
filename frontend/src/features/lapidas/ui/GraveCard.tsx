import { IconoCorona, IconoHoja, IconoMas } from '../../../shared/ui/iconos'
import { colorDeFoto, nombreDelDuenio, type Grave } from '../model/lapida'

/**
 * Tarjeta de lápida del prototipo.
 *
 * `tamano="baja"` es la variante de la grilla del perfil (imagen de 70px y pie
 * con el conteo de coronas).
 */

type Props = {
  lapida: Grave
  tamano?: 'alta' | 'baja'
  categoria?: string
  onAbrir: (lapida: Grave) => void
  onCorona?: (lapida: Grave) => void
  /** Cuando se pasa, la tarjeta muestra el botón de borrar. */
  onBorrar?: (lapida: Grave) => void
}

export function GraveCard({ lapida, tamano = 'alta', categoria, onAbrir, onCorona, onBorrar }: Props) {
  return (
    <article className="lapida">
      <button
        className={`lapida__foto ${tamano === 'baja' ? 'lapida__foto--baja' : 'lapida__foto--alta'}`}
        style={{ background: colorDeFoto(lapida.id) }}
        onClick={() => onAbrir(lapida)}
        aria-label={`Ver la lápida de ${lapida.nombrePlanta}`}
      >
        <IconoHoja />
      </button>

      <button className="lapida__nombre" onClick={() => onAbrir(lapida)}>
        “{lapida.nombrePlanta}”
      </button>

      <p className="lapida__meta">
        {categoria || 'Sin categoría'} · {lapida.causaMuerte}
      </p>

      <p className="lapida__autor">por @{nombreDelDuenio(lapida)}</p>

      {tamano === 'alta' ? (
        <button className="lapida__coronas" onClick={() => onCorona?.(lapida)} disabled={!onCorona}>
          <IconoCorona />
          <span>{lapida.coronasCount}</span>
        </button>
      ) : (
        <p className="lapida__coronas">
          <IconoCorona />
          <span>{lapida.coronasCount} coronas</span>
        </p>
      )}

      {onBorrar && (
        <button
          className="lapida__borrar"
          onClick={() => onBorrar(lapida)}
          aria-label={`Borrar la lápida de ${lapida.nombrePlanta}`}
        >
          BORRAR
        </button>
      )}
    </article>
  )
}

/** Celda punteada al final de la grilla: publicar una lápida nueva. */
export function GraveCardNueva({ tamano = 'alta', texto, onClick }: { tamano?: 'alta' | 'baja'; texto: string; onClick: () => void }) {
  return (
    <button
      className={`lapida lapida--nueva${tamano === 'baja' ? ' lapida--nueva--baja' : ''}`}
      onClick={onClick}
    >
      <IconoMas />
      <span>{texto}</span>
    </button>
  )
}
