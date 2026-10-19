import { AvisoNoDisponible } from '../../../shared/ui/Aviso'
import { Boton } from '../../../shared/ui/Boton'
import { IconoInsignia, IconoPersona } from '../../../shared/ui/iconos'
import type { Session } from '../../sesiones/model/sesion'
import type { Category } from '../../categorias/model/categoria'
import type { Grave } from '../model/lapida'
import { GraveCard, GraveCardNueva } from './GraveCard'

type Props = {
  sesion: Session | null
  lapidas: Grave[]
  categorias: Category[]
  onAbrir: (lapida: Grave) => void
  onPublicar: () => void
  onIniciarSesion: () => void
}

export function PerfilPage({ sesion, lapidas, categorias, onAbrir, onPublicar, onIniciarSesion }: Props) {
  const propias = sesion
    ? lapidas.filter((lapida) => lapida.autor === sesion.username)
    : []
  const coronasRecibidas = propias.reduce((total, lapida) => total + lapida.coronasCount, 0)
  const nombreCategoria = (id: number) => categorias.find((c) => c.id === id)?.nombre

  return (
    <>
      <section className="perfil__cabecera">
        <div className="perfil__avatar">
          <IconoPersona />
        </div>
        <div className="perfil__identidad">
          <h1 className="perfil__nombre">{sesion ? sesion.username : 'Invitado'}</h1>
          <p className="perfil__desde">
            {sesion ? 'Tu jardín memorial' : 'Iniciá sesión para ver tu jardín'}
          </p>
        </div>
        {sesion ? (
          <Boton tamano="chico" disabled title="Editar perfil todavía no tiene endpoint">
            EDITAR PERFIL
          </Boton>
        ) : (
          <Boton tamano="chico" onClick={onIniciarSesion}>
            INICIAR SESIÓN
          </Boton>
        )}
      </section>

      <section className="perfil__stats">
        <div className="perfil__stat">
          <p className="perfil__stat-valor perfil__stat-valor--rojo">{propias.length}</p>
          <p className="perfil__stat-etiqueta">Plantas asesinadas</p>
        </div>
        <div className="perfil__stat">
          <p className="perfil__stat-valor perfil__stat-valor--madera">{coronasRecibidas}</p>
          <p className="perfil__stat-etiqueta">Coronas recibidas</p>
        </div>
        <div className="perfil__stat perfil__stat--insignia">
          <IconoInsignia />
          <p className="perfil__insignia-texto">
            <strong>Superviviente Zombie</strong>
            <br />
            una lápida “resucitó”
          </p>
        </div>
      </section>

      <AvisoNoDisponible>
        El contador de “plantas asesinadas” muestra tus lápidas publicadas: la API todavía no
        expone un contador propio.
      </AvisoNoDisponible>

      <h2 className="perfil__seccion">SU CEMENTERIO</h2>

      <div className="grilla grilla--cuatro">
        {propias.map((lapida) => (
          <GraveCard
            key={lapida.id}
            lapida={lapida}
            tamano="baja"
            categoria={nombreCategoria(lapida.categoriaId)}
            onAbrir={onAbrir}
          />
        ))}
        <GraveCardNueva tamano="baja" texto="Nueva lápida" onClick={onPublicar} />
      </div>
    </>
  )
}
