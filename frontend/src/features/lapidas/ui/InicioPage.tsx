import { rutaDeDetalle } from '../../../app/ruta'
import { IconoCorona } from '../../../shared/ui/iconos'
import { Boton } from '../../../shared/ui/Boton'
import { Enlace } from '../../../shared/ui/Enlace'
import type { Category } from '../../categorias/model/categoria'
import type { Session } from '../../sesiones/model/sesion'
import type { Asesino, Grave } from '../model/lapida'
import { esDuenio } from '../model/lapida'
import { GraveCard } from './GraveCard'
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
  /** Navegación interna: los links del sidebar siguen teniendo URL real. */
  onNavegar: (destino: string) => void
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
  onActualizar,
  actualizando,
  onNavegar,
}: Props) {
  const salonDelHonor = [...lapidas].sort((a, b) => b.coronasCount - a.coronasCount).slice(0, 3)

  return (
    <div className="pantalla__contenido">
      <section className="feed">
        <div className="panel-oscuro">
          <h1 className="panel-oscuro__titulo">CEMENTERIO DE PLANTAS</h1>
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
        </div>
      </section>

      <aside className="sidebar">
        <div className="sidebar__cabecera">SALÓN DEL HONOR</div>
        <div className="sidebar__lista">
          {salonDelHonor.map((lapida, indice) => (
            <Enlace
              key={lapida.id}
              href={rutaDeDetalle(lapida.id)}
              onNavegar={onNavegar}
              className="sidebar__fila"
            >
              <span>
                {indice + 1}. “{lapida.nombrePlanta}”
              </span>
              {/* Corona dorada y contador en madera, como en el prototipo. El
                  rojo (`--rojo`) es el color de "Asesinos seriales" y de los
                  errores: usarlo acá convertía una ofrenda en una alarma. */}
              <span className="sidebar__valor">
                <IconoCorona size={10} />
                {lapida.coronasCount}
              </span>
            </Enlace>
          ))}
        </div>

        <div className="sidebar__cabecera">ASESINOS SERIALES</div>
        <div className="sidebar__lista sidebar__lista--crece">
          {errorAsesinos ? (
            <AvisoAsesinos>{errorAsesinos}</AvisoAsesinos>
          ) : (
            <ListaAsesinos asesinos={asesinos} variante="sidebar" onNavegar={onNavegar} />
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
