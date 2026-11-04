import { Boton } from '../../../shared/ui/Boton'
import { IconoCorona, IconoHoja } from '../../../shared/ui/iconos'
import type { Category } from '../../categorias/model/categoria'
import { ListaComentarios } from '../../comentarios/ui/ListaComentarios'
import type { Session } from '../../sesiones/model/sesion'
import { colorDeFoto, formatearFecha, nombreDelDuenio, puedeBorrar, type Grave } from '../model/lapida'

type Props = {
  lapida: Grave
  categorias: Category[]
  sesion: Session | null
  onCorona: (lapida: Grave) => Promise<void>
  onBorrar: (lapida: Grave) => Promise<void>
  onRevivir: (lapida: Grave) => Promise<void>
  onVolver: () => void
}

/**
 * Página propia de una lápida.
 *
 * El panel de madera (`detalle__info`) contiene la foto, una card con los datos
 * del texto (título, autor, epitafio y datos) y las acciones. La columna derecha
 * es solo para los comentarios, así la ficha se lee de corrido y la conversación
 * no la interrumpe.
 */
export function DetallePage({ lapida, categorias, sesion, onCorona, onBorrar, onRevivir, onVolver }: Props) {
  const categoria = categorias.find((c) => c.id === lapida.categoriaId)?.nombre || 'Sin categoría'
  const mostrarBorrar = puedeBorrar(lapida, sesion)
  const esPropia = !!sesion && lapida.duenio?.username === sesion.username
  // Bloqueado en backend; acá se deshabilita para no ofrecer una acción que va a
  // fallar. Se deja habilitado el quitar si ya tenía corona (datos viejos).
  const coronaBloqueada = esPropia && !lapida.coronadaPorMi
  const puedeRevivir =
    !!sesion &&
    !lapida.resucitada &&
    (sesion.rol === 'admin' || lapida.duenio?.username === sesion.username)

  return (
    <div className="pantalla__contenido">
      <section className="detalle__info">
        <div
          className="detalle__foto"
          style={lapida.fotoUrl ? undefined : { background: colorDeFoto(lapida.id) }}
        >
          {lapida.fotoUrl ? (
            <img className="detalle__foto-img" src={lapida.fotoUrl} alt="" />
          ) : (
            <IconoHoja size={96} />
          )}
        </div>

        <div className="detalle__card">
          <h1 className="detalle__titulo">“{lapida.nombrePlanta.toUpperCase()}”</h1>
          <p className="detalle__autor">por @{nombreDelDuenio(lapida)}</p>

          <p className="detalle__epitafio">“{lapida.epitafio}”</p>

          {lapida.resucitada && (
            <p
              className="detalle__resucitada"
              aria-label="Lápida resucitada"
              role="status"
            >
              RESUCITADA
            </p>
          )}

          <div className="detalle__datos">
            <span>
              <strong>Categoría:</strong> {categoria}
            </span>
            <span>
              <strong>Causa de muerte:</strong> {lapida.causaMuerte}
            </span>
            <span>
              <strong>Fecha de fallecimiento:</strong> {formatearFecha(lapida.fechaFallecimiento)}
            </span>
          </div>
        </div>

        <div className="detalle__acciones">
          {puedeRevivir && (
            <Boton
              onClick={() => {
                // Revivir es irreversible desde la UI: se confirma antes de
                // disparar el POST que además otorga la insignia al dueño.
                const confirmado = window.confirm(
                  '¿Revivir esta lápida? Quedará marcada como resucitada y, si es la primera vez, se le dará la insignia “Superviviente Zombie” al dueño.',
                )
                if (confirmado) void onRevivir(lapida)
              }}
            >
              REVIVIR
            </Boton>
          )}

          <Boton
            className={`detalle__corona${lapida.coronadaPorMi ? ' detalle__corona--puesta' : ''}`}
            onClick={() => void onCorona(lapida)}
            disabled={coronaBloqueada}
            title={coronaBloqueada ? 'No podés coronarte a vos mismo' : undefined}
            aria-pressed={lapida.coronadaPorMi ?? false}
            aria-label={
              coronaBloqueada
                ? 'No podés coronar tu propia lápida'
                : lapida.coronadaPorMi
                  ? 'Quitar la corona de esta lápida'
                  : 'Dar una corona a esta lápida'
            }
          >
            <IconoCorona size={14} stroke={lapida.coronadaPorMi ? '#E8C547' : undefined} />
            {lapida.coronadaPorMi ? 'QUITAR CORONA' : 'DAR CORONA'} · {lapida.coronasCount}
          </Boton>

          {mostrarBorrar && (
            <Boton
              className="detalle__borrar"
              variante="peligro"
              onClick={() => void onBorrar(lapida)}
              aria-label={`Borrar la lápida de ${lapida.nombrePlanta}`}
            >
              BORRAR ESTA LÁPIDA
            </Boton>
          )}

          <Boton className="detalle__volver" tamano="chico" onClick={onVolver}>
            VOLVER AL CEMENTERIO
          </Boton>
        </div>
      </section>

      {/* La `key` remonta la lista al cambiar de lápida, para que el estado
          (texto a medio escribir, comentarios cargados) no se arrastre. */}
      <ListaComentarios key={lapida.id} lapidaId={lapida.id} sesion={sesion} />
    </div>
  )
}
