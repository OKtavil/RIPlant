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
export function DetallePage({ lapida, categorias, sesion, onCorona, onBorrar, onVolver }: Props) {
  const categoria = categorias.find((c) => c.id === lapida.categoriaId)?.nombre || 'Sin categoría'
  const mostrarBorrar = puedeBorrar(lapida, sesion)

  return (
    <div className="pantalla__contenido">
      <section className="detalle__info">
        <div className="detalle__foto" style={{ background: colorDeFoto(lapida.id) }}>
          <IconoHoja size={96} />
        </div>

        <div className="detalle__card">
          <h1 className="detalle__titulo">“{lapida.nombrePlanta.toUpperCase()}”</h1>
          <p className="detalle__autor">por @{nombreDelDuenio(lapida)}</p>

          <p className="detalle__epitafio">“{lapida.epitafio}”</p>

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
          <Boton
            className="detalle__corona"
            onClick={() => void onCorona(lapida)}
            aria-label="Dar una corona a esta lápida"
          >
            <IconoCorona size={14} />
            DAR CORONA · {lapida.coronasCount}
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
