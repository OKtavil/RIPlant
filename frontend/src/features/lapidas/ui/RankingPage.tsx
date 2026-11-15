import { rutaDeDetalle } from '../../../app/ruta'
import { Enlace } from '../../../shared/ui/Enlace'
import { IconoCorona } from '../../../shared/ui/iconos'
import type { Category } from '../../categorias/model/categoria'
import { nombreDelDuenio, type Asesino, type Grave } from '../model/lapida'
import { AvisoAsesinos, ListaAsesinos } from './ListaAsesinos'

type Props = {
  lapidas: Grave[]
  categorias: Category[]
  asesinos: Asesino[]
  errorAsesinos: string
  /** Navegación interna: las filas son links con URL real. */
  onNavegar: (destino: string) => void
}

export function RankingPage({
  lapidas,
  categorias,
  asesinos,
  errorAsesinos,
  onNavegar,
}: Props) {
  const salonDelHonor = [...lapidas].sort((a, b) => b.coronasCount - a.coronasCount)

  const nombreCategoria = (id: number) => categorias.find((c) => c.id === id)?.nombre

  return (
    <div className="pantalla__contenido">
      <section className="ranking">
        <div className="panel-oscuro">
          <h1 className="panel-oscuro__titulo">SALÓN DEL HONOR</h1>
        </div>
        <p className="ranking__nota">Ordenado por coronas recibidas</p>

        {salonDelHonor.map((lapida, indice) => (
          <Enlace
            key={lapida.id}
            href={rutaDeDetalle(lapida.id)}
            onNavegar={onNavegar}
            className="ranking__fila"
          >
            <span>
              <span className="ranking__puesto">
                {indice + 1}. “{lapida.nombrePlanta}”
              </span>
              <br />
              <span className="ranking__detalle">
                @{nombreDelDuenio(lapida)} · {nombreCategoria(lapida.categoriaId) || 'Sin categoría'}
              </span>
              <br />
              <span className="ranking__epitafio">{lapida.epitafio}</span>
            </span>
            <span className="ranking__valor">
              <IconoCorona />
              {lapida.coronasCount}
            </span>
          </Enlace>
        ))}
      </section>

      <section className="ranking">
        <div className="panel-oscuro">
          <h1 className="panel-oscuro__titulo">ASESINOS SERIALES</h1>
        </div>
        <p className="ranking__nota">Ordenado por lápidas publicadas</p>

        {errorAsesinos ? (
          <AvisoAsesinos>{errorAsesinos}</AvisoAsesinos>
        ) : (
          <ListaAsesinos asesinos={asesinos} variante="fila" onNavegar={onNavegar} />
        )}
      </section>
    </div>
  )
}
