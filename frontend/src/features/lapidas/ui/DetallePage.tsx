import { AvisoNoDisponible } from '../../../shared/ui/Aviso'
import { Boton } from '../../../shared/ui/Boton'
import { IconoCorona, IconoHoja } from '../../../shared/ui/iconos'
import type { Category } from '../../categorias/model/categoria'
import { colorDeFoto, formatearFecha, type Grave } from '../model/lapida'

type Props = {
  lapida: Grave
  categorias: Category[]
  onCorona: (lapida: Grave) => Promise<void>
  onVolver: () => void
}

export function DetallePage({ lapida, categorias, onCorona, onVolver }: Props) {
  const categoria = categorias.find((c) => c.id === lapida.categoriaId)?.nombre || 'Sin categoría'

  return (
    <div className="pantalla__contenido">
      <section className="detalle__media">
        <div className="detalle__foto" style={{ background: colorDeFoto(lapida.id) }}>
          <IconoHoja size={96} />
        </div>
        <p className="detalle__epitafio">“{lapida.epitafio}”</p>
      </section>

      <section className="detalle__info">
        <h1 className="detalle__titulo">“{lapida.nombrePlanta.toUpperCase()}”</h1>
        <p className="detalle__autor">por @{lapida.autor}</p>

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

        <Boton
          className="detalle__corona"
          onClick={() => void onCorona(lapida)}
          aria-label="Dar una corona a esta lápida"
        >
          <IconoCorona size={14} />
          DAR CORONA · {lapida.coronasCount}
        </Boton>

        <div className="detalle__comentarios">
          <h2 className="detalle__comentarios-titulo">COMENTARIOS</h2>
          <AvisoNoDisponible>
            Los comentarios todavía no tienen endpoint, así que no se pueden leer ni escribir.
          </AvisoNoDisponible>
          <input type="text" placeholder="Escribe un comentario..." disabled />
        </div>

        <Boton tamano="chico" onClick={onVolver}>
          VOLVER AL CEMENTERIO
        </Boton>
      </section>
    </div>
  )
}
