import { IconoCorona } from '../../../shared/ui/iconos'
import { Boton } from '../../../shared/ui/Boton'
import type { Category } from '../../categorias/model/categoria'
import type { Session } from '../../sesiones/model/sesion'
import type { Asesino, Grave } from '../model/lapida'
import { esDuenio } from '../model/lapida'
import { GraveCard, GraveCardNueva } from './GraveCard'
import { AvisoAsesinos, ListaAsesinos } from './ListaAsesinos'

type Props = {
  lapidas: Grave[]
  categorias: Category[]
  asesinos: Asesino[]
  sesion: Session | null
  errorAsesinos: string
  onAbrir: (lapida: Grave) => void
  onCorona: (lapida: Grave) => void
  onPublicar: () => void
  /** Vuelve a pedir las lápidas, para ver lo que publicó otra sesión (E003). */
  onActualizar: () => void
  actualizando: boolean
}

function nombreCategoria(categorias: Category[], id: number): string | undefined {
  return categorias.find((categoria) => categoria.id === id)?.nombre
}

export function InicioPage({
  lapidas,
  categorias,
  asesinos,
  sesion,
  errorAsesinos,
  onAbrir,
  onCorona,
  onPublicar,
  onActualizar,
  actualizando,
}: Props) {
  const salonDelHonor = [...lapidas].sort((a, b) => b.coronasCount - a.coronasCount).slice(0, 3)

  return (
    <div className="pantalla__contenido">
      <section className="feed">
        <div className="panel-oscuro">
          <h1 className="panel-oscuro__titulo">CEMENTERIO DE PLANTAS</h1>
          {/* El slot derecho del panel ya existía (`space-between`): el botón
              entra ahí sin tocar el layout de la grilla. */}
          <Boton tamano="chico" onClick={onActualizar} disabled={actualizando}>
            {actualizando ? 'ACTUALIZANDO…' : 'ACTUALIZAR'}
          </Boton>
        </div>

        <div className="grilla grilla--tres">
          {lapidas.map((lapida) => (
            <GraveCard
              key={lapida.id}
              lapida={lapida}
              categoria={nombreCategoria(categorias, lapida.categoriaId)}
              onAbrir={onAbrir}
              onCorona={onCorona}
              propia={esDuenio(lapida, sesion)}
            />
          ))}
          <GraveCardNueva texto="Publica tu lápida" onClick={onPublicar} />
        </div>
      </section>

      <aside className="sidebar">
        <div className="sidebar__cabecera">SALÓN DEL HONOR</div>
        <div className="sidebar__lista">
          {salonDelHonor.map((lapida, indice) => (
            <button key={lapida.id} className="sidebar__fila" onClick={() => onAbrir(lapida)}>
              <span>
                {indice + 1}. “{lapida.nombrePlanta}”
              </span>
              <span className="sidebar__valor sidebar__valor--rojo">
                <IconoCorona size={10} stroke="#C0392B" />
                {lapida.coronasCount}
              </span>
            </button>
          ))}
        </div>

        <div className="sidebar__cabecera">ASESINOS SERIALES</div>
        <div className="sidebar__lista sidebar__lista--crece">
          {errorAsesinos ? (
            <AvisoAsesinos>{errorAsesinos}</AvisoAsesinos>
          ) : (
            <ListaAsesinos asesinos={asesinos} variante="sidebar" />
          )}
        </div>

        <p className="sidebar__nota">
          Insignia especial: <strong>“Superviviente Zombie”</strong> — se otorga cuando
          editás una lápida propia para que vuelva a mostrar señales de vida.
        </p>
      </aside>
    </div>
  )
}
