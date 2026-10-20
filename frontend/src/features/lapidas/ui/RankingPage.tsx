import { IconoCorona } from '../../../shared/ui/iconos'
import type { Category } from '../../categorias/model/categoria'
import type { Asesino, Grave } from '../model/lapida'
import { AvisoAsesinos, ListaAsesinos } from './ListaAsesinos'

type Props = {
  lapidas: Grave[]
  categorias: Category[]
  asesinos: Asesino[]
  errorAsesinos: string
  onAbrir: (lapida: Grave) => void
}

export function RankingPage({ lapidas, categorias, asesinos, errorAsesinos, onAbrir }: Props) {
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
          <button key={lapida.id} className="ranking__fila" onClick={() => onAbrir(lapida)}>
            <span>
              <span className="ranking__puesto">
                {indice + 1}. “{lapida.nombrePlanta}”
              </span>
              <br />
              <span className="ranking__detalle">
                @{lapida.autor} · {nombreCategoria(lapida.categoriaId) || 'Sin categoría'}
              </span>
            </span>
            <span className="ranking__valor">
              <IconoCorona />
              {lapida.coronasCount}
            </span>
          </button>
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
          <ListaAsesinos asesinos={asesinos} variante="fila" />
        )}
      </section>
    </div>
  )
}
