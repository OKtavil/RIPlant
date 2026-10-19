import { AvisoNoDisponible } from '../../../shared/ui/Aviso'
import { IconoCalavera, IconoCorona } from '../../../shared/ui/iconos'
import type { Category } from '../../categorias/model/categoria'
import type { Grave } from '../model/lapida'

type Props = {
  lapidas: Grave[]
  categorias: Category[]
  onAbrir: (lapida: Grave) => void
}

export function RankingPage({ lapidas, categorias, onAbrir }: Props) {
  const salonDelHonor = [...lapidas].sort((a, b) => b.coronasCount - a.coronasCount)

  // La API solo expone `autor` como texto en cada lápida, no un contador por
  // persona: se agrupa por autor y se cuenta cuántas lápidas publicó.
  const porAutor = new Map<string, number>()
  for (const lapida of lapidas) {
    porAutor.set(lapida.autor, (porAutor.get(lapida.autor) ?? 0) + 1)
  }
  const asesinos = [...porAutor.entries()].sort((a, b) => b[1] - a[1])

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

        {asesinos.map(([autor, total], indice) => (
          <div key={autor} className="ranking__fila">
            <span>
              <span className="ranking__puesto">
                {indice + 1}. @{autor}
              </span>
              <br />
              <span className="ranking__detalle">plantas en el cementerio</span>
            </span>
            <span className="ranking__valor ranking__valor--rojo">
              <IconoCalavera />
              {total}
            </span>
          </div>
        ))}

        <AvisoNoDisponible>
          Este ranking cuenta las lápidas publicadas por autor. El contador de “plantas
          asesinadas” todavía no existe en la API.
        </AvisoNoDisponible>
      </section>
    </div>
  )
}
