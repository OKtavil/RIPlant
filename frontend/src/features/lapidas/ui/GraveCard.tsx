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
  /** La lápida es del usuario de la sesión: no puede coronarse a sí mismo. */
  propia?: boolean
  /** Cuando se pasa, la tarjeta muestra el botón de borrar. */
  onBorrar?: (lapida: Grave) => void
}

export function GraveCard({ lapida, tamano = 'alta', categoria, onAbrir, onCorona, propia = false, onBorrar }: Props) {
  return (
    <article className={`lapida${lapida.resucitada ? ' lapida--resucitada' : ''}`}>
      {lapida.resucitada && (
        <span className="lapida__resucitada" aria-label="Lápida resucitada">
          RESUCITADA
        </span>
      )}
      <button
        className={`lapida__foto ${tamano === 'baja' ? 'lapida__foto--baja' : 'lapida__foto--alta'}`}
        style={lapida.fotoUrl ? undefined : { background: colorDeFoto(lapida.id) }}
        onClick={() => onAbrir(lapida)}
        aria-label={`Ver la lápida de ${lapida.nombrePlanta}`}
      >
        {lapida.fotoUrl ? (
          <img className="lapida__foto-img" src={lapida.fotoUrl} alt="" />
        ) : (
          <IconoHoja />
        )}
      </button>

      <button className="lapida__nombre" onClick={() => onAbrir(lapida)}>
        “{lapida.nombrePlanta}”
      </button>

      <p className="lapida__epitafio">{lapida.epitafio}</p>

      <p className="lapida__meta">
        {categoria || 'Sin categoría'} · {lapida.causaMuerte}
      </p>

      <p className="lapida__autor">por @{nombreDelDuenio(lapida)}</p>

      {tamano === 'alta' ? (
        <button
          className={`lapida__coronas${lapida.coronadaPorMi ? ' lapida__coronas--puesta' : ''}`}
          onClick={() => onCorona?.(lapida)}
          disabled={!onCorona || (propia && !lapida.coronadaPorMi)}
          // El backend también lo rechaza; acá se explica antes de que falle.
          title={propia && !lapida.coronadaPorMi ? 'No podés coronarte a vos mismo' : undefined}
          aria-pressed={lapida.coronadaPorMi ?? false}
          aria-label={
            propia && !lapida.coronadaPorMi
              ? `No podés coronar tu propia lápida: ${lapida.nombrePlanta}`
              : lapida.coronadaPorMi
                ? `Quitar la corona de ${lapida.nombrePlanta}`
                : `Dar una corona a ${lapida.nombrePlanta}`
          }
        >
          <IconoCorona stroke={lapida.coronadaPorMi ? '#E8C547' : undefined} />
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
