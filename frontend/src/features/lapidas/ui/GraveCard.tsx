import { IconoCorona, IconoHoja, IconoMas } from '../../../shared/ui/iconos'
import {
  colorDeFoto,
  LIMITES_TARJETA,
  nombreDelDuenio,
  recortarTexto,
  type Grave,
} from '../model/lapida'

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
    <article className={`lapida lapida--${tamano}${lapida.resucitada ? ' lapida--resucitada' : ''}`}>
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

      <div className="lapida__contenido">
        {/* El rótulo se queda siempre en el flujo, oculto cuando la lápida no
            revivió: así reserva su alto y la tarjeta no cambia de tamaño. */}
        <span
          className="lapida__resucitada"
          aria-hidden={lapida.resucitada ? undefined : true}
          aria-label={lapida.resucitada ? 'Lápida resucitada' : undefined}
        >
          RESUCITADA
        </span>

        <button className="lapida__nombre" onClick={() => onAbrir(lapida)}>
          “{recortarTexto(lapida.nombrePlanta, LIMITES_TARJETA.nombre)}”
        </button>

        <p className="lapida__epitafio">{recortarTexto(lapida.epitafio, LIMITES_TARJETA.epitafio)}</p>

        <p className="lapida__meta lapida__categoria">{categoria || 'Sin categoría'}</p>

        <p className="lapida__meta lapida__causa">
          {recortarTexto(lapida.causaMuerte, LIMITES_TARJETA.causa)}
        </p>

        <p className="lapida__autor">por @{nombreDelDuenio(lapida)}</p>
      </div>

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
          <IconoCorona stroke={lapida.coronadaPorMi ? '#2E1305' : '#6E3A12'} />
          <span>{lapida.coronasCount}</span>
        </button>
      ) : onCorona ? (
        <button
          className={`lapida__coronas${lapida.coronadaPorMi ? ' lapida__coronas--puesta' : ''}`}
          onClick={() => onCorona(lapida)}
          disabled={propia && !lapida.coronadaPorMi}
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
          <IconoCorona stroke={lapida.coronadaPorMi ? '#2E1305' : '#6E3A12'} />
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
